import { describe, expect, it } from 'vitest';
import {
	doneMeta,
	dropHint,
	dropTitle,
	ordinal,
	resultNumeral,
	settingsSummary,
	timeLeft
} from './format';
import type { SettingsSchema } from '#lib/tools/types.ts';

const MB = 1024 * 1024;

describe('drop copy', () => {
	it('lists each format once and adds paste only for images', () => {
		const image = {
			category: 'image',
			accepts: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'], noun: 'image' },
			maxBytes: 50 * MB
		};
		expect(dropTitle(image)).toBe('Drop images here');
		expect(dropHint(image)).toBe('or paste with ⌘V. JPG, PNG, WebP, HEIC up to 50 MB each.');
	});

	it('mentions the duration limit for songs', () => {
		const song = {
			category: 'music',
			accepts: { extensions: ['mp3', 'wav', 'flac', 'm4a'], noun: 'audio file' },
			maxBytes: 200 * MB,
			maxDurationSec: 15 * 60
		};
		expect(dropTitle(song)).toBe('Drop audio files here');
		expect(dropHint(song)).toBe('MP3, WAV, FLAC, M4A up to 200 MB and 15 minutes each.');
	});
});

describe('resultNumeral', () => {
	const result = {
		inputName: 'IMG_2041.jpg',
		inputSize: 2.4 * MB,
		outputs: [{ name: 'IMG_2041.jpg', size: 380 * 1024 }]
	};

	it('shows the size change with a real minus sign', () => {
		expect(resultNumeral('saving', result)).toBe('−85%');
		expect(
			resultNumeral('saving', { ...result, outputs: [{ name: 'a.jpg', size: 2.4 * MB }] })
		).toBe('0%');
		expect(resultNumeral('saving', { ...result, inputSize: undefined })).toBe('Done');
	});

	it('shows the output format or width, and Done otherwise', () => {
		expect(resultNumeral('format', { ...result, outputs: [{ name: 'a.webp', size: 1 }] })).toBe(
			'WebP'
		);
		expect(resultNumeral('width', { ...result, width: 1280 })).toBe('1280 px');
		expect(resultNumeral('width', result)).toBe('Done');
		expect(resultNumeral(undefined, result)).toBe('Done');
	});
});

describe('doneMeta', () => {
	it('names the format change only when there is one', () => {
		expect(
			doneMeta({
				inputName: 'IMG_2043.heic',
				inputSize: 3.4 * MB,
				outputs: [{ name: 'IMG_2043.webp', size: 1.2 * MB }]
			})
		).toBe('HEIC → WebP · 3.4 MB → 1.2 MB');
		expect(
			doneMeta({ inputName: 'a.jpeg', inputSize: 2 * MB, outputs: [{ name: 'a.jpg', size: MB }] })
		).toBe('2 MB → 1 MB');
		expect(doneMeta({ inputName: 'a.jpg', outputs: [{ name: 'a.jpg', size: MB }] })).toBe('1 MB');
	});
});

describe('small words', () => {
	it('writes ordinals', () => {
		expect([1, 2, 3, 4, 11, 12, 21].map(ordinal)).toEqual([
			'1st',
			'2nd',
			'3rd',
			'4th',
			'11th',
			'12th',
			'21st'
		]);
	});

	it('estimates time left only once a Job has moved', () => {
		expect(timeLeft(0.01, 10_000)).toBeUndefined();
		expect(timeLeft(0.5, 3 * 60_000)).toBe('about 3 min left');
		expect(timeLeft(0.9, 10_000)).toBe('less than a minute left');
	});
});

describe('settingsSummary', () => {
	it('names the settings a Job ran with, using option labels and units', () => {
		const settings = {
			quality: { type: 'number', label: 'Quality', min: 1, max: 100, default: 80 },
			width: { type: 'number', label: 'Width', min: 0, max: 100, unit: 'px', default: 0 },
			output: {
				type: 'select',
				label: 'Output',
				options: [{ value: 'same', label: 'Same format' }],
				default: 'same'
			}
		} satisfies SettingsSchema;
		expect(settingsSummary({ settings }, { quality: 60, width: 1280, output: 'same' })).toBe(
			'Quality 60 · Width 1280 px · Same format'
		);
	});
});
