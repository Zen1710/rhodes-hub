import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { runOnFixture } from '#lib/server/tool-harness.ts';
import run from './run';

const defaults = { format: 'mp3', bitrate: '320', sampleRate: 'same' };

async function probe(path: string) {
	const { stdout } = await promisify(execFile)('ffprobe', [
		'-v',
		'error',
		'-show_entries',
		'stream=codec_name,sample_rate,bit_rate:format=duration:format_tags=title',
		'-of',
		'json',
		path
	]);
	const { streams, format } = JSON.parse(stdout);
	return {
		codec: streams[0].codec_name as string,
		sampleRate: Number(streams[0].sample_rate),
		bitrate: Number(streams[0].bit_rate),
		duration: Number(format.duration),
		title: (format.tags?.title ?? format.tags?.TITLE) as string | undefined
	};
}

async function convert(settings: Partial<typeof defaults>) {
	const result = await runOnFixture(run, 'tone.flac', { ...defaults, ...settings });
	const [out] = result.outputs;
	const info = await probe(out.path);
	await result.cleanup();
	return { name: out.name, ...info };
}

describe('Convert audio', () => {
	it('converts to each format and renames the file', async () => {
		expect(await convert({ format: 'mp3' })).toMatchObject({ name: 'tone.mp3', codec: 'mp3' });
		expect(await convert({ format: 'm4a' })).toMatchObject({ name: 'tone.m4a', codec: 'aac' });
		expect(await convert({ format: 'ogg' })).toMatchObject({ name: 'tone.ogg', codec: 'opus' });
		expect(await convert({ format: 'flac' })).toMatchObject({ name: 'tone.flac', codec: 'flac' });
		expect(await convert({ format: 'wav' })).toMatchObject({
			name: 'tone.wav',
			codec: 'pcm_s16le'
		});
	});

	it('encodes at the chosen bitrate', async () => {
		expect((await convert({ bitrate: '128' })).bitrate).toBe(128_000);
		expect((await convert({ bitrate: '320' })).bitrate).toBe(320_000);
	});

	it('keeps the sample rate, length, and tags unless asked to resample', async () => {
		const same = await convert({});
		expect(same.sampleRate).toBe(44_100);
		expect(same.duration).toBeCloseTo(1, 1);
		expect(same.title).toBe('Rhodes Hub test fixture');

		expect((await convert({ sampleRate: '48000' })).sampleRate).toBe(48_000);
	});

	it('writes OGG at 48 kHz, the only rate Opus supports', async () => {
		expect((await convert({ format: 'ogg', sampleRate: '44100' })).sampleRate).toBe(48_000);
	});

	it('fails with a readable error when the file has no audio', async () => {
		await expect(runOnFixture(run, 'photo.jpg', defaults)).rejects.toThrow(
			'ffmpeg could not convert this file: Output file does not contain any stream'
		);
	});

	it('does nothing once the Job is canceled', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			runOnFixture(run, 'tone.flac', defaults, { signal: controller.signal })
		).rejects.toThrow();
	});
});
