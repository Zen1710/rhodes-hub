import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { runOnFixture } from '#lib/server/tool-harness.ts';
import run from './run';

const defaults = { to: 'webp', quality: 85, metadata: 'keep' };

describe('Convert format', () => {
	it('writes each target format with the matching extension', async () => {
		for (const [to, format, name] of [
			['webp', 'webp', 'photo.webp'],
			['jpg', 'jpeg', 'photo.jpg'],
			['png', 'png', 'photo.png'],
			['avif', 'heif', 'photo.avif']
		] as const) {
			const result = await runOnFixture(run, 'photo.heic', { ...defaults, to });
			expect(
				result.outputs.map((o) => o.name),
				to
			).toEqual([name]);
			expect((await sharp(result.outputs[0].path).metadata()).format, to).toBe(format);
			await result.cleanup();
		}
	});

	it('keeps metadata by default and strips it when asked', async () => {
		const kept = await runOnFixture(run, 'photo.jpg', defaults);
		const stripped = await runOnFixture(run, 'photo.jpg', { ...defaults, metadata: 'strip' });

		expect((await sharp(kept.outputs[0].path).metadata()).exif).toBeDefined();
		expect((await sharp(stripped.outputs[0].path).metadata()).exif).toBeUndefined();
		await kept.cleanup();
		await stripped.cleanup();
	});

	it('fills transparency with white when the target format has none', async () => {
		const result = await runOnFixture(run, 'logo.png', { ...defaults, to: 'jpg' });
		const { data } = await sharp(result.outputs[0].path)
			.raw()
			.toBuffer({ resolveWithObject: true });

		// 50% blue (10, 120, 180) over white is about (132, 187, 217); over black it would be (5, 60, 90).
		expect(data[0]).toBeGreaterThan(100);
		expect(data[1]).toBeGreaterThan(150);
		await result.cleanup();
	});
});
