import { copyFile, mkdir, mkdtemp, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import type { ToolRunner } from './jobs/service';

export interface HarnessResult {
	inputSize: number;
	outputs: { name: string; path: string; size: number }[];
	note?: string;
	cleanup: () => Promise<void>;
}

/** Test helper: runs a Tool's `run.ts` on a file from `tests/fixtures/` in a temp folder. */
export async function runOnFixture(
	run: ToolRunner,
	fixture: string,
	settings: Record<string, unknown>,
	{
		signal = new AbortController().signal,
		reportProgress = () => {}
	}: { signal?: AbortSignal; reportProgress?: (progress: number) => void } = {}
): Promise<HarnessResult> {
	const root = await mkdtemp(join(tmpdir(), 'rhodes-tool-'));
	const inputDir = join(root, 'input');
	const outputDir = join(root, 'output');
	await mkdir(inputDir);
	await mkdir(outputDir);
	const source = resolve('tests/fixtures', fixture);
	const inputPath = join(inputDir, basename(source));
	await copyFile(source, inputPath);

	const cleanup = () => rm(root, { recursive: true, force: true });
	let result;
	try {
		result = await run({ inputPath, outputDir, settings, signal, reportProgress });
	} catch (error) {
		await cleanup();
		throw error;
	}
	const names = (await readdir(outputDir)).sort();
	const outputs = await Promise.all(
		names.map(async (name) => {
			const path = join(outputDir, name);
			return { name, path, size: (await stat(path)).size };
		})
	);
	return { inputSize: (await stat(inputPath)).size, outputs, note: result?.note, cleanup };
}
