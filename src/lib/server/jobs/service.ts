import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Registry } from '#lib/tools/registry.ts';
import { checkInput, formatBytes } from '#lib/tools/input.ts';
import { parseSettings } from '#lib/tools/settings.ts';
import type { Readiness } from '../dependencies';
import type { JobQueue, JobStatus } from './queue';
import { contentTypeOf } from './content-type';
import type { JobStorage } from './storage';
import { zipFiles } from './zip';

export interface ToolRunContext {
	inputPath: string;
	outputDir: string;
	settings: Record<string, unknown>;
	signal: AbortSignal;
	reportProgress: (progress: number) => void;
}

/**
 * What a Tool's `run.ts` default-exports. Every file written to `outputDir` becomes a Job output.
 * It may return a `note` for the user about the result, such as "Already optimized".
 */
export type ToolRunner = (ctx: ToolRunContext) => Promise<void | { note?: string }>;

export interface OutputFile {
	name: string;
	size: number;
}

export interface JobView {
	id: string;
	toolId: string;
	filename: string;
	status: JobStatus;
	progress: number;
	error?: string;
	finishedAt?: number;
	files?: OutputFile[];
	/** What the Tool said about a done Job's result. */
	note?: string;
}

interface JobOutput {
	files: OutputFile[];
	note?: string;
}

export interface Download {
	filename: string;
	contentType: string;
	/** Byte length, when known up front (single files). */
	size?: number;
	stream: ReadableStream<Uint8Array>;
}

export interface StartRequest {
	filename: string;
	query: Record<string, string | undefined>;
	body: ReadableStream<Uint8Array>;
	/** Declared size (Content-Length), when known. */
	size?: number;
}

/** A refusal the API turns into an HTTP response. */
export class ServiceError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly details?: Record<string, string>
	) {
		super(message);
	}
}

class TooLarge extends Error {}

/** Passes bytes through and fails once more than `max` have gone by. */
function limitBytes(max: number) {
	let seen = 0;
	return new Transform({
		transform(chunk: Buffer, _encoding, callback) {
			seen += chunk.length;
			callback(seen > max ? new TooLarge() : null, chunk);
		}
	});
}

interface JobRecord {
	toolId: string;
	filename: string;
	settings: Record<string, unknown>;
	inputPath: string;
	outputDir: string;
}

interface ServiceDeps {
	queue: JobQueue;
	storage: JobStorage;
	registry: Registry;
	runners: Record<string, ToolRunner>;
	/** From the startup dependency check; a Tool missing here counts as ready. */
	readiness?: Record<string, Readiness>;
}

/** photo.jpg, photo (2).jpg, photo (3).jpg */
function uniqueName(name: string, taken: Set<string>): string {
	if (!taken.has(name)) return name;
	const ext = extname(name);
	const base = name.slice(0, name.length - ext.length);
	for (let n = 2; ; n++) {
		const candidate = `${base} (${n})${ext}`;
		if (!taken.has(candidate)) return candidate;
	}
}

async function emptyDir(dir: string): Promise<void> {
	await rm(dir, { recursive: true, force: true });
	await mkdir(dir, { recursive: true });
}

async function listOutputs(dir: string): Promise<OutputFile[]> {
	const names = (await readdir(dir)).sort();
	return Promise.all(
		names.map(async (name) => ({ name, size: (await stat(join(dir, name))).size }))
	);
}

export function createJobService({ queue, storage, registry, runners, readiness }: ServiceDeps) {
	const records = new Map<string, JobRecord>();

	function launch(record: JobRecord & { id: string }) {
		const { id, toolId, settings, inputPath, outputDir } = record;
		const tool = registry.get(toolId)!;
		const runner = runners[toolId];
		records.set(id, record);
		queue.submit({
			id,
			toolId,
			lane: tool.lane,
			input: inputPath,
			settings,
			run: async ({ signal, reportProgress }): Promise<JobOutput> => {
				let result;
				try {
					result = await runner({ inputPath, outputDir, settings, signal, reportProgress });
				} finally {
					if (signal.aborted) await emptyDir(outputDir);
				}
				return { files: await listOutputs(outputDir), note: result?.note };
			}
		});
	}

	return {
		async start(toolId: string, request: StartRequest): Promise<JobView> {
			const tool = registry.get(toolId);
			if (!tool) throw new ServiceError(404, `Unknown Tool: ${toolId}`);
			if (!runners[toolId]) throw new ServiceError(503, `${tool.name} is not ready.`);
			const ready = readiness?.[toolId];
			if (ready && !ready.ready) {
				throw new ServiceError(
					503,
					`${tool.name} is not ready. ${ready.problem}`,
					ready.fix ? { fix: ready.fix } : undefined
				);
			}

			const filename = basename(request.filename ?? '');
			if (!filename || filename === '.' || filename === '..') {
				throw new ServiceError(400, 'Missing filename.');
			}
			const check = checkInput(tool, { filename, size: request.size ?? 0 });
			if (!check.ok) throw new ServiceError(422, check.reason);

			const parsed = parseSettings(tool.settings, request.query);
			if (!parsed.ok)
				throw new ServiceError(400, 'Invalid settings.', parsed.errors as Record<string, string>);
			const settings = parsed.value;

			const id = randomUUID();
			const paths = await storage.prepare(id);
			const inputPath = join(paths.input, filename);
			try {
				await pipeline(
					Readable.fromWeb(request.body as import('node:stream/web').ReadableStream),
					limitBytes(tool.maxBytes),
					createWriteStream(inputPath)
				);
			} catch (error) {
				await storage.remove(id);
				if (error instanceof TooLarge) {
					throw new ServiceError(422, `This file is over the ${formatBytes(tool.maxBytes)} limit.`);
				}
				throw error;
			}
			launch({ id, toolId, filename, settings, inputPath, outputDir: paths.output });
			return this.get(id)!;
		},

		async download(id: string, file?: string): Promise<Download> {
			const job = this.get(id);
			if (!job) throw new ServiceError(404, `No Job with id ${id}.`);
			if (job.status !== 'done' || !job.files) {
				throw new ServiceError(
					409,
					`This Job is ${job.status}, so there is nothing to download yet.`
				);
			}
			const { outputDir } = records.get(id)!;
			const files = job.files;

			const pick = file ?? (files.length === 1 ? files[0].name : undefined);
			if (pick !== undefined) {
				const match = files.find((f) => f.name === pick);
				if (!match) throw new ServiceError(404, `This Job has no file named "${pick}".`);
				return {
					filename: match.name,
					contentType: contentTypeOf(match.name),
					size: match.size,
					stream: Readable.toWeb(
						createReadStream(join(outputDir, match.name))
					) as ReadableStream<Uint8Array>
				};
			}
			const base = basename(job.filename, extname(job.filename));
			return {
				filename: `${base}.zip`,
				contentType: 'application/zip',
				stream: zipFiles(files.map((f) => ({ name: f.name, path: join(outputDir, f.name) })))
			};
		},

		async downloadBatch(ids: string[]): Promise<Download> {
			const jobs = ids.map((id) => {
				const job = this.get(id);
				if (!job) throw new ServiceError(404, `No Job with id ${id}.`);
				return job;
			});
			const done = jobs.filter((job) => job.status === 'done' && job.files);
			if (done.length === 0) throw new ServiceError(409, 'None of these Jobs has finished yet.');

			const taken = new Set<string>();
			const entries = done.flatMap((job) =>
				job.files!.map((file) => {
					const name = uniqueName(file.name, taken);
					taken.add(name);
					return { name, path: join(records.get(job.id)!.outputDir, file.name) };
				})
			);
			return {
				filename: 'rhodes-hub-results.zip',
				contentType: 'application/zip',
				stream: zipFiles(entries)
			};
		},

		async retry(id: string): Promise<JobView> {
			const job = this.get(id);
			if (!job) throw new ServiceError(404, `No Job with id ${id}.`);
			if (job.status !== 'failed') throw new ServiceError(409, 'Only failed Jobs can be retried.');
			const old = records.get(id)!;
			const newId = randomUUID();
			const paths = await storage.prepare(newId);
			const inputPath = join(paths.input, old.filename);
			await copyFile(old.inputPath, inputPath);
			launch({ ...old, id: newId, inputPath, outputDir: paths.output });
			return this.get(newId)!;
		},

		cancel(id: string): JobView {
			const job = this.get(id);
			if (!job) throw new ServiceError(404, `No Job with id ${id}.`);
			if (job.status !== 'queued' && job.status !== 'running') {
				throw new ServiceError(409, `This Job already finished (${job.status}).`);
			}
			queue.cancel(id);
			return this.get(id)!;
		},

		get(id: string): JobView | undefined {
			const job = queue.get(id);
			const record = records.get(id);
			if (!job || !record) return undefined;
			const output = job.output as JobOutput | undefined;
			return {
				id: job.id,
				toolId: job.toolId,
				filename: record.filename,
				status: job.status,
				progress: job.progress,
				error: job.error,
				finishedAt: job.finishedAt,
				files: output?.files,
				note: output?.note
			};
		}
	};
}

export type JobService = ReturnType<typeof createJobService>;
