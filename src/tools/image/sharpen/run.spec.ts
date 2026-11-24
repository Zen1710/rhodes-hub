import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { runOnFixture } from '#lib/server/tool-harness.ts';
import run from './run';

const defaults = { strength: 'medium', radius: 1, output: 'same' };

async function sharpen(settings: Partial<typeof defaults>, fixture = 'photo.jpg') {
	const result = await runOnFixture(run, fixture, { ...defaults, ...settings });
	const [out] = result.outputs;
	const meta = await sharp(out.path).metadata();
	const { sharpness } = await sharp(out.path).stats();
	await result.cleanup();
	return { name: out.name, meta, sharpness };
}

describe('Sharpen', () => {
	it('makes the photo sharper, more so at a higher strength', async () => {
		const { sharpness: original } = await sharp('tests/fixtures/photo.jpg').stats();
		const low = await sharpen({ strength: 'low' });
		const high = await sharpen({ strength: 'high' });

		expect(low.sharpness).toBeGreaterThan(original);
		expect(high.sharpness).toBeGreaterThan(low.sharpness);
	});

	it('keeps the name, format, and size', async () => {
		const { name, meta } = await sharpen({});

		expect(name).toBe('photo.jpg');
		expect(meta).toMatchObject({ format: 'jpeg', width: 320, height: 240 });
	});

	it('converts to another format and renames the file', async () => {
		const { name, meta } = await sharpen({ output: 'webp' });

		expect(name).toBe('photo.webp');
		expect(meta.format).toBe('webp');
	});

	it('writes HEIC input as JPG, since HEIC cannot be written', async () => {
		const { name, meta } = await sharpen({}, 'photo.heic');

		expect(name).toBe('photo.jpg');
		expect(meta).toMatchObject({ format: 'jpeg', width: 320, height: 240 });
	});

	it('keeps a PNG lossless and transparent', async () => {
		const { meta } = await sharpen({}, 'logo.png');

		expect(meta).toMatchObject({ format: 'png', hasAlpha: true, isPalette: false });
	});

	it('does nothing once the Job is canceled', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			runOnFixture(run, 'photo.jpg', defaults, { signal: controller.signal })
		).rejects.toThrow();
	});
});
