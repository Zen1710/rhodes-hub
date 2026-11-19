import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import { buildRegistry } from '#lib/tools/registry.ts';
import type { ToolMeta } from '#lib/tools/types.ts';
import { createJobQueue } from './queue';
import { createJobService, type ToolRunner } from './service';
import { createJobStorage } from './storage';

const MB = 1024 * 1024;

const imageMeta: ToolMeta = {
	name: 'Compress',
	description: 'Shrink file size.',
	keywords: [],
	lane: 'light',
	accepts: { extensions: ['jpg', 'png'], noun: 'image' },
	maxBytes: 1 * MB,
	dependencies: [],
	settings: { quality: { type: 'number', label: 'Quality', min: 1, max: 100, default: 80 } }
};

const registry = buildRegistry({ '/src/tools/image/compress/meta.ts': { default: imageMeta } });

/** Writes `<name>.out` holding the input bytes and the settings it saw. */
const copyRunner: ToolRunner = async ({ inputPath, outputDir, settings }) => {
	const bytes = await readFile(inputPath, 'utf8');
	await writeFile(
		join(outputDir, `${basename(inputPath)}.out`),
		`${bytes}|${JSON.stringify(settings)}`
	);
};

/** Writes Vocals and Instrumental, like Remove vocal. */
const stemsRunner: ToolRunner = async ({ outputDir }) => {
	await writeFile(join(outputDir, 'vocals.mp3'), 'VOX');
	await writeFile(join(outputDir, 'instrumental.mp3'), 'INST');
};

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

function body(text: string): ReadableStream<Uint8Array> {
	return new Blob([text]).stream();
}

let root: string;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'rhodes-service-'));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

/** Waits until the Job leaves queued/running. */
async function settled(service: ReturnType<typeof setup>['service'], id: string) {
	await vi.waitFor(() => {
		const status = service.get(id)?.status;
		if (status === 'queued' || status === 'running') throw new Error(`still ${status}`);
	});
	return service.get(id)!;
}

function setup(runners: Record<string, ToolRunner> = { 'image/compress': copyRunner }) {
	const queue = createJobQueue({ heavy: 1, light: 2 });
	const storage = createJobStorage(root);
	return { queue, storage, service: createJobService({ queue, storage, registry, runners }) };
}

describe('job service', () => {
	it('stores the upload, runs the Tool, and lists its output files', async () => {
		const { service } = setup();

		const job = await service.start('image/compress', {
			filename: 'photo.jpg',
			query: { quality: '60' },
			body: body('pixels')
		});

		expect(await settled(service, job.id)).toMatchObject({
			id: job.id,
			toolId: 'image/compress',
			filename: 'photo.jpg',
			status: 'done',
			files: [{ name: 'photo.jpg.out', size: 'pixels|{"quality":60}'.length }]
		});
		expect(await readdir(join(root, job.id, 'input'))).toEqual(['photo.jpg']);
		expect(service.get(job.id)?.note).toBeUndefined();
	});

	it('passes on a note the Tool leaves about its result', async () => {
		const { service } = setup({
			'image/compress': async (ctx) => {
				await copyRunner(ctx);
				return { note: 'Already optimized' };
			}
		});

		const job = await service.start('image/compress', {
			filename: 'photo.jpg',
			query: {},
			body: body('pixels')
		});

		expect(await settled(service, job.id)).toMatchObject({
			status: 'done',
			note: 'Already optimized',
			files: [{ name: 'photo.jpg.out' }]
		});
	});

	it('refuses bad requests with a status and message, leaving nothing on disk', async () => {
		const { service } = setup();
		const start = (toolId: string, request: Partial<Parameters<typeof service.start>[1]>) =>
			service.start(toolId, { filename: 'a.jpg', query: {}, body: body('x'), ...request });

		await expect(start('image/missing', {})).rejects.toMatchObject({
			status: 404,
			message: 'Unknown Tool: image/missing'
		});
		await expect(start('image/compress', { filename: '' })).rejects.toMatchObject({
			status: 400,
			message: 'Missing filename.'
		});
		await expect(start('image/compress', { filename: 'doc.pdf' })).rejects.toMatchObject({
			status: 422,
			message: 'PDF is not an image this Tool reads.'
		});
		await expect(start('image/compress', { size: 2 * MB })).rejects.toMatchObject({
			status: 422,
			message: '2 MB is over the 1 MB limit.'
		});
		await expect(start('image/compress', { query: { quality: '0' } })).rejects.toMatchObject({
			status: 400,
			message: 'Invalid settings.',
			details: { quality: 'Quality must be a number from 1 to 100.' }
		});
		expect(await readdir(root)).toEqual([]);
	});

	it('stops an upload that grows past the limit without a declared size', async () => {
		const { service } = setup();

		await expect(
			service.start('image/compress', {
				filename: 'huge.png',
				query: {},
				body: body('x'.repeat(MB + 1))
			})
		).rejects.toMatchObject({ status: 422, message: 'This file is over the 1 MB limit.' });
		expect(await readdir(root)).toEqual([]);
	});

	it('keeps only the base name of the uploaded filename', async () => {
		const { service } = setup();

		const job = await service.start('image/compress', {
			filename: '../../outside.jpg',
			query: {},
			body: body('x')
		});

		expect(job.filename).toBe('outside.jpg');
		expect(await readdir(join(root, job.id, 'input'))).toEqual(['outside.jpg']);
	});

	it('downloads a single output as itself and several outputs as one zip', async () => {
		const single = setup();
		const one = await single.service.start('image/compress', {
			filename: 'photo.jpg',
			query: {},
			body: body('px')
		});
		await settled(single.service, one.id);

		const file = await single.service.download(one.id);
		expect(file).toMatchObject({ filename: 'photo.jpg.out', size: 'px|{"quality":80}'.length });
		expect(new TextDecoder().decode(await readAll(file.stream))).toBe('px|{"quality":80}');

		const stems = setup({ 'image/compress': stemsRunner });
		const two = await stems.service.start('image/compress', {
			filename: 'song.jpg',
			query: {},
			body: body('x')
		});
		await settled(stems.service, two.id);

		const zip = await stems.service.download(two.id);
		expect(zip).toMatchObject({ filename: 'song.zip', contentType: 'application/zip' });
		const entries = unzipSync(await readAll(zip.stream));
		expect(Object.keys(entries).sort()).toEqual(['instrumental.mp3', 'vocals.mp3']);
		expect(new TextDecoder().decode(entries['vocals.mp3'])).toBe('VOX');

		const vocals = await stems.service.download(two.id, 'vocals.mp3');
		expect(vocals).toMatchObject({ filename: 'vocals.mp3', contentType: 'audio/mpeg' });
		expect(new TextDecoder().decode(await readAll(vocals.stream))).toBe('VOX');
	});

	it('refuses downloads for unknown Jobs, unfinished Jobs, and files the Job did not make', async () => {
		const never: ToolRunner = () => new Promise(() => {});
		const { service } = setup({ 'image/compress': never });
		const job = await service.start('image/compress', {
			filename: 'a.jpg',
			query: {},
			body: body('x')
		});

		await expect(service.download('nope')).rejects.toMatchObject({ status: 404 });
		await expect(service.download(job.id)).rejects.toMatchObject({
			status: 409,
			message: 'This Job is running, so there is nothing to download yet.'
		});

		const done = setup();
		const ok = await done.service.start('image/compress', {
			filename: 'a.jpg',
			query: {},
			body: body('x')
		});
		await settled(done.service, ok.id);
		await expect(done.service.download(ok.id, '../input/a.jpg')).rejects.toMatchObject({
			status: 404,
			message: 'This Job has no file named "../input/a.jpg".'
		});
	});

	it('cancels a running Job and deletes the half-written output once the Tool stops', async () => {
		const halfWriter: ToolRunner = async ({ outputDir, signal }) => {
			await writeFile(join(outputDir, 'partial.jpg'), 'half');
			await new Promise((_, reject) => {
				if (signal.aborted) return reject(new Error('aborted'));
				signal.addEventListener('abort', () => reject(new Error('aborted')));
			});
		};
		const { service } = setup({ 'image/compress': halfWriter });
		const job = await service.start('image/compress', {
			filename: 'a.jpg',
			query: {},
			body: body('x')
		});
		await vi.waitFor(async () => {
			expect(await readdir(join(root, job.id, 'output'))).toEqual(['partial.jpg']);
		});

		expect(service.cancel(job.id).status).toBe('canceled');

		await vi.waitFor(async () => {
			expect(await readdir(join(root, job.id, 'output'))).toEqual([]);
		});
		expect(service.get(job.id)?.status).toBe('canceled');
	});

	it('refuses to cancel unknown or finished Jobs', async () => {
		const { service } = setup();
		const job = await service.start('image/compress', {
			filename: 'a.jpg',
			query: {},
			body: body('x')
		});
		await settled(service, job.id);

		expect(() => service.cancel('nope')).toThrow(expect.objectContaining({ status: 404 }));
		expect(() => service.cancel(job.id)).toThrow(
			expect.objectContaining({ status: 409, message: 'This Job already finished (done).' })
		);
	});

	it('retries a failed Job as a new Job with its own copy of the input', async () => {
		let calls = 0;
		const flaky: ToolRunner = async (ctx) => {
			calls++;
			if (calls === 1) throw new Error('Disk full');
			await copyRunner(ctx);
		};
		const { service, storage } = setup({ 'image/compress': flaky });
		const failed = await service.start('image/compress', {
			filename: 'scan.png',
			query: { quality: '40' },
			body: body('scan')
		});
		expect(await settled(service, failed.id)).toMatchObject({
			status: 'failed',
			error: 'Disk full'
		});

		const retried = await service.retry(failed.id);
		await storage.remove(failed.id);

		expect(retried.id).not.toBe(failed.id);
		expect(await settled(service, retried.id)).toMatchObject({
			status: 'done',
			filename: 'scan.png',
			files: [{ name: 'scan.png.out', size: 'scan|{"quality":40}'.length }]
		});
		await expect(service.retry(retried.id)).rejects.toMatchObject({
			status: 409,
			message: 'Only failed Jobs can be retried.'
		});
	});

	it('zips every finished Job of a Batch into one download, renaming clashes', async () => {
		const sameName: ToolRunner = async ({ outputDir }) => {
			await writeFile(join(outputDir, 'photo.jpg'), 'small');
		};
		const never: ToolRunner = () => new Promise(() => {});
		const { service } = setup({ 'image/compress': sameName });
		const start = (name: string) =>
			service.start('image/compress', { filename: name, query: {}, body: body('x') });
		const a = await start('a.jpg');
		const b = await start('b.jpg');
		await settled(service, a.id);
		await settled(service, b.id);

		const zip = await service.downloadBatch([a.id, b.id]);

		expect(zip).toMatchObject({
			filename: 'rhodes-hub-results.zip',
			contentType: 'application/zip'
		});
		const entries = unzipSync(await readAll(zip.stream));
		expect(Object.keys(entries)).toEqual(['photo.jpg', 'photo (2).jpg']);

		await expect(service.downloadBatch([a.id, 'nope'])).rejects.toMatchObject({ status: 404 });

		const busy = setup({ 'image/compress': never });
		const running = await busy.service.start('image/compress', {
			filename: 'c.jpg',
			query: {},
			body: body('x')
		});
		await expect(busy.service.downloadBatch([running.id])).rejects.toMatchObject({
			status: 409,
			message: 'None of these Jobs has finished yet.'
		});
	});

	it('refuses a Tool that has no runner yet as not ready', async () => {
		const { service } = setup({});

		await expect(
			service.start('image/compress', { filename: 'a.jpg', query: {}, body: body('x') })
		).rejects.toMatchObject({ status: 503, message: 'Compress is not ready.' });
		expect(await readdir(root)).toEqual([]);
	});

	it('explains why a Tool is not ready and how to fix it', async () => {
		const service = createJobService({
			queue: createJobQueue({ heavy: 1, light: 2 }),
			storage: createJobStorage(root),
			registry,
			runners: { 'image/compress': copyRunner },
			readiness: {
				'image/compress': {
					ready: false,
					problem: 'ffmpeg is not installed.',
					fix: 'brew install ffmpeg'
				}
			}
		});

		await expect(
			service.start('image/compress', { filename: 'a.jpg', query: {}, body: body('x') })
		).rejects.toMatchObject({
			status: 503,
			message: 'Compress is not ready. ffmpeg is not installed.',
			details: { fix: 'brew install ffmpeg' }
		});
		expect(await readdir(root)).toEqual([]);
	});
});
