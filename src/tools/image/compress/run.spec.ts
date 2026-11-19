import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { runOnFixture } from '#lib/server/tool-harness.ts';
import run from './run';

const defaults = { quality: 80, output: 'same', metadata: 'strip' };

describe('Compress', () => {
	it('shrinks a JPG, keeps its name and format, and strips metadata by default', async () => {
		const result = await runOnFixture(run, 'photo.jpg', defaults);
		const [out] = result.outputs;
		const meta = await sharp(out.path).metadata();

		expect(result.outputs.map((o) => o.name)).toEqual(['photo.jpg']);
		expect(out.size).toBeLessThan(result.inputSize);
		expect(meta).toMatchObject({ format: 'jpeg', width: 320, height: 240 });
		expect(meta.exif).toBeUndefined();
		expect(result.note).toBeUndefined();
		await result.cleanup();
	});

	it('makes smaller files at lower quality', async () => {
		const low = await runOnFixture(run, 'photo.jpg', { ...defaults, quality: 30 });
		const high = await runOnFixture(run, 'photo.jpg', { ...defaults, quality: 90 });

		expect(low.outputs[0].size).toBeLessThan(high.outputs[0].size);
		await low.cleanup();
		await high.cleanup();
	});

	it('keeps metadata when asked', async () => {
		const result = await runOnFixture(run, 'photo.jpg', { ...defaults, metadata: 'keep' });
		const { exif } = await sharp(result.outputs[0].path).metadata();

		expect(exif?.toString('latin1')).toContain('Rhodes Hub test fixture');
		await result.cleanup();
	});

	it('converts to another format and renames the file', async () => {
		const result = await runOnFixture(run, 'photo.jpg', { ...defaults, output: 'webp' });

		expect(result.outputs.map((o) => o.name)).toEqual(['photo.webp']);
		expect((await sharp(result.outputs[0].path).metadata()).format).toBe('webp');
		await result.cleanup();
	});

	it('writes HEIC input as JPG, since HEIC cannot be written', async () => {
		const result = await runOnFixture(run, 'photo.heic', defaults);

		expect(result.outputs.map((o) => o.name)).toEqual(['photo.jpg']);
		expect(await sharp(result.outputs[0].path).metadata()).toMatchObject({
			format: 'jpeg',
			width: 320,
			height: 240
		});
		await result.cleanup();
	});

	it('keeps the original file when re-encoding would make it bigger', async () => {
		const result = await runOnFixture(run, 'photo.jpg', {
			...defaults,
			quality: 100,
			metadata: 'keep'
		});
		const [out] = result.outputs;

		expect(out.name).toBe('photo.jpg');
		expect(await readFile(out.path)).toEqual(await readFile(resolve('tests/fixtures/photo.jpg')));
		expect(result.note).toBe('Already optimized');
		await result.cleanup();
	});

	it('still strips metadata when asked, even if the result is bigger', async () => {
		const result = await runOnFixture(run, 'photo.jpg', { ...defaults, quality: 100 });
		const [out] = result.outputs;

		expect(out.size).toBeGreaterThan(result.inputSize);
		expect((await sharp(out.path).metadata()).exif).toBeUndefined();
		await result.cleanup();
	});

	it('keeps transparency in a PNG', async () => {
		const result = await runOnFixture(run, 'logo.png', defaults);
		const meta = await sharp(result.outputs[0].path).metadata();

		expect(meta).toMatchObject({ format: 'png', hasAlpha: true });
		await result.cleanup();
	});

	it('does nothing once the Job is canceled', async () => {
		const controller = new AbortController();
		controller.abort();

		await expect(
			runOnFixture(run, 'photo.jpg', defaults, { signal: controller.signal })
		).rejects.toThrow();
	});
});
