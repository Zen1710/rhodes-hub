import { afterEach, describe, expect, it } from 'vitest';
import { runOnFixture } from '#lib/server/tool-harness.ts';
import { createRunner } from './run';

// The real model takes about a minute per song, so these tests drive a fake separator
// that follows the same contract as python/separate.py.
const run = createRunner({ command: 'python3', args: ['tests/fixtures/fake-separator.py'] });

afterEach(() => {
	delete process.env.FAKE_SEPARATOR;
});

describe('Remove vocal', () => {
	it('writes Vocals and Instrumental named after the song, and reports progress', async () => {
		const progress: number[] = [];
		const result = await runOnFixture(
			run,
			'tone.flac',
			{ format: 'mp3' },
			{ reportProgress: (p) => progress.push(p) }
		);
		expect(result.outputs.map((o) => o.name)).toEqual([
			'tone (Instrumental).mp3',
			'tone (Vocals).mp3'
		]);
		expect(progress).toEqual([0.5, 1]);
		await result.cleanup();
	});

	it('fails with the last line the separator printed', async () => {
		process.env.FAKE_SEPARATOR = 'fail';
		await expect(runOnFixture(run, 'tone.flac', { format: 'wav' })).rejects.toThrow(
			'Vocal separation failed: the audio could not be decoded.'
		);
	});

	it('stops the separator when the Job is canceled', async () => {
		process.env.FAKE_SEPARATOR = 'slow';
		const controller = new AbortController();
		const started = Date.now();
		const job = runOnFixture(
			run,
			'tone.flac',
			{ format: 'mp3' },
			{ signal: controller.signal, reportProgress: () => controller.abort() }
		);
		await expect(job).rejects.toThrow();
		expect(Date.now() - started).toBeLessThan(5_000);
	});

	it('does nothing once the Job is canceled', async () => {
		const controller = new AbortController();
		controller.abort();
		await expect(
			runOnFixture(run, 'tone.flac', { format: 'mp3' }, { signal: controller.signal })
		).rejects.toThrow();
	});

	it('refuses a song over the duration limit before loading the model', async () => {
		const short = createRunner({
			command: 'python3',
			args: ['tests/fixtures/fake-separator.py'],
			maxDurationSec: 0.5
		});
		await expect(runOnFixture(short, 'tone.flac', { format: 'mp3' })).rejects.toThrow(
			/1 s is over the .*limit/
		);
	});
});
