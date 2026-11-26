import { execFile, spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { PYTHON } from '#lib/server/dependencies.ts';
import type { ToolRunner } from '#lib/server/jobs/service.ts';
import { checkInput } from '#lib/tools/input.ts';
import meta from './meta';

interface Settings {
	format: 'mp3' | 'wav';
}

async function durationOf(path: string, signal: AbortSignal): Promise<number> {
	const { stdout } = await promisify(execFile)(
		'ffprobe',
		['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
		{ signal }
	);
	return Number(stdout.trim());
}

/**
 * Runs the separator script (`python/separate.py`, or a fake one in tests) on one song.
 * The script prints "progress <0..1>" lines and writes "<name> (Vocals)" and "<name> (Instrumental)".
 */
export function createRunner({
	command,
	args,
	maxDurationSec = meta.maxDurationSec
}: {
	command: string;
	args: string[];
	maxDurationSec?: number;
}): ToolRunner {
	return async ({ inputPath, outputDir, settings, signal, reportProgress }) => {
		signal.throwIfAborted();
		const { format } = settings as unknown as Settings;

		// The browser checks the length too, but only the server can be sure of it.
		const check = checkInput(
			{ ...meta, maxDurationSec },
			{ filename: inputPath, size: 0, durationSec: await durationOf(inputPath, signal) }
		);
		if (!check.ok) throw new Error(check.reason);

		await new Promise<void>((done, fail) => {
			const child = spawn(command, [...args, inputPath, outputDir, format], {
				signal,
				stdio: ['ignore', 'pipe', 'pipe']
			});
			let stderr = '';
			child.stderr.on('data', (chunk) => (stderr += chunk));
			child.stdout.on('data', (chunk: Buffer) => {
				for (const match of chunk.toString().matchAll(/^progress ([\d.]+)$/gm)) {
					reportProgress(Number(match[1]));
				}
			});
			child.on('error', fail);
			child.on('close', (code) => {
				if (code === 0) return done();
				const lines = stderr.trim().split('\n');
				fail(new Error(lines.at(-1) || `The separator stopped with exit code ${code}.`));
			});
		});
	};
}

export default createRunner({ command: PYTHON, args: [resolve('python/separate.py')] });
