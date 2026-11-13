import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { runOnFixture } from '#lib/server/tool-harness.ts';
import run from './run';

const defaults = { mode: 'pixels', width: 1280, height: 0, percent: 50 };

async function sizeAfter(settings: Partial<typeof defaults>, fixture = 'photo.jpg') {
	const result = await runOnFixture(run, fixture, { ...defaults, ...settings });
	const { width, height, format } = await sharp(result.outputs[0].path).metadata();
	await result.cleanup();
	return { size: [width, height], format, name: result.outputs[0].name };
}

describe('Resize', () => {
	it('scales from the width or the height alone, keeping the ratio', async () => {
		expect((await sizeAfter({ width: 160 })).size).toEqual([160, 120]);
		expect((await sizeAfter({ width: 0, height: 60 })).size).toEqual([80, 60]);
	});

	it('crops to exact pixels from the center when both sides are set', async () => {
		expect((await sizeAfter({ width: 100, height: 100 })).size).toEqual([100, 100]);
	});

	it('scales by a percentage', async () => {
		expect((await sizeAfter({ mode: 'percent', percent: 25 })).size).toEqual([80, 60]);
	});

	it('keeps the name and format, writing HEIC as JPG', async () => {
		expect(await sizeAfter({ width: 160 }, 'logo.png')).toMatchObject({
			name: 'logo.png',
			format: 'png'
		});
		expect(await sizeAfter({ width: 160 }, 'photo.heic')).toMatchObject({
			name: 'photo.jpg',
			format: 'jpeg'
		});
	});

	it('refuses when neither width nor height is set', async () => {
		await expect(
			runOnFixture(run, 'photo.jpg', { ...defaults, width: 0, height: 0 })
		).rejects.toThrow('Set a width or a height.');
	});

	it('keeps PNG lossless instead of reducing it to a palette', async () => {
		const result = await runOnFixture(run, 'logo.png', { ...defaults, width: 100 });
		const meta = await sharp(result.outputs[0].path).metadata();

		expect(meta.isPalette).toBe(false);
		await result.cleanup();
	});
});
