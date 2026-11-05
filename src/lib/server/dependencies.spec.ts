import { describe, expect, it } from 'vitest';
import { buildRegistry } from '#lib/tools/registry.ts';
import type { ToolMeta } from '#lib/tools/types.ts';
import { checkDependencies, toolReadiness, type Probe } from './dependencies';
import type { ToolRunner } from './jobs/service';

/** A probe that succeeds only for the listed commands. */
const only =
	(...available: string[]): Probe =>
	async (command) =>
		available.includes(command);

describe('checkDependencies', () => {
	it('reports every dependency ready when its command runs', async () => {
		const probe = only('ffmpeg', 'ffprobe', 'python/.venv/bin/python');

		expect(await checkDependencies(probe)).toEqual({
			ffmpeg: { ok: true },
			ffprobe: { ok: true },
			'vocal-separator': { ok: true }
		});
	});

	it('says what is missing and how to fix it', async () => {
		expect(await checkDependencies(only())).toEqual({
			ffmpeg: { ok: false, problem: 'ffmpeg is not installed.', fix: 'brew install ffmpeg' },
			ffprobe: { ok: false, problem: 'ffprobe is not installed.', fix: 'brew install ffmpeg' },
			'vocal-separator': {
				ok: false,
				problem: 'The vocal separation model is not set up.',
				fix: 'pnpm run setup'
			}
		});
	});
});

const meta = (name: string, dependencies: ToolMeta['dependencies']): ToolMeta => ({
	name,
	description: '',
	keywords: [],
	lane: 'light',
	accepts: { extensions: ['mp3'], noun: 'audio file' },
	maxBytes: 1,
	dependencies,
	settings: {}
});

describe('toolReadiness', () => {
	const registry = buildRegistry({
		'/src/tools/image/compress/meta.ts': { default: meta('Compress', []) },
		'/src/tools/music/convert-audio/meta.ts': {
			default: meta('Convert audio', ['ffmpeg', 'ffprobe'])
		},
		'/src/tools/music/remove-vocal/meta.ts': {
			default: meta('Remove vocal', ['ffmpeg', 'vocal-separator'])
		}
	});
	const run: ToolRunner = async () => {};

	it('marks a Tool ready only when every dependency is there and it has a runner', async () => {
		const statuses = await checkDependencies(only('ffmpeg'));
		const runners = { 'image/compress': run, 'music/convert-audio': run };

		expect(toolReadiness(registry, statuses, runners)).toEqual({
			'image/compress': { ready: true },
			'music/convert-audio': {
				ready: false,
				problem: 'ffprobe is not installed.',
				fix: 'brew install ffmpeg'
			},
			'music/remove-vocal': { ready: false, problem: 'This Tool is not built yet.' }
		});
	});
});
