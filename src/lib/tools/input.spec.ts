import { describe, expect, it } from 'vitest';
import { checkInput } from './input';
import type { InputRules } from './types';

const MB = 1024 * 1024;
const image: InputRules = {
	accepts: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'], noun: 'image' },
	maxBytes: 50 * MB
};

describe('checkInput', () => {
	it('accepts a supported extension in any letter case', () => {
		expect(checkInput(image, { filename: 'IMG_2041.JPG', size: 2 * MB })).toEqual({ ok: true });
	});

	it('rejects a format the Tool does not read', () => {
		expect(checkInput(image, { filename: 'contract.pdf', size: MB })).toEqual({
			ok: false,
			reason: 'PDF is not an image this Tool reads.'
		});
		expect(checkInput(image, { filename: 'README', size: MB })).toEqual({
			ok: false,
			reason: 'This file has no extension, so its format is unknown.'
		});
	});

	it('rejects a file over the size limit and names both sizes', () => {
		expect(checkInput(image, { filename: 'panorama.png', size: 72 * MB })).toEqual({
			ok: false,
			reason: '72 MB is over the 50 MB limit.'
		});
		expect(checkInput(image, { filename: 'exact.png', size: 50 * MB })).toEqual({ ok: true });
	});

	it('rejects a song longer than the duration limit when the duration is known', () => {
		const song: InputRules = {
			accepts: { extensions: ['mp3', 'wav'], noun: 'audio file' },
			maxBytes: 200 * MB,
			maxDurationSec: 15 * 60
		};
		const file = { filename: 'dj-set.mp3', size: 90 * MB };

		expect(checkInput(song, { ...file, durationSec: 112 * 60 })).toEqual({
			ok: false,
			reason: '1 h 52 min is over the 15-minute limit.'
		});
		expect(checkInput(song, { ...file, durationSec: 16 * 60 + 30 })).toEqual({
			ok: false,
			reason: '16 min 30 s is over the 15-minute limit.'
		});
		expect(checkInput(song, { ...file, durationSec: 15 * 60 })).toEqual({ ok: true });
		expect(checkInput(song, file)).toEqual({ ok: true });
	});
});
