import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadImage } from './image';

const fixture = (name: string) => resolve('tests/fixtures', name);

describe('loadImage', () => {
	it('opens JPG, PNG, WebP, AVIF, and HEIC as a sharp pipeline and reports the source format', async () => {
		for (const [name, format] of [
			['photo.jpg', 'jpeg'],
			['logo.png', 'png'],
			['photo.webp', 'webp'],
			['photo.avif', 'avif'],
			['photo.heic', 'heic']
		] as const) {
			const image = await loadImage(fixture(name));
			const { info } = await image.pipeline.png().toBuffer({ resolveWithObject: true });

			expect(image.format, name).toBe(format);
			expect([info.width, info.height], name).toEqual(
				name === 'logo.png' ? [200, 200] : [320, 240]
			);
		}
	});
});
