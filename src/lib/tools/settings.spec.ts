import { describe, expect, it } from 'vitest';
import { parseSettings } from './settings';
import type { SettingsSchema } from './types';

const compress = {
	quality: { type: 'number', label: 'Quality', min: 1, max: 100, default: 80 },
	output: {
		type: 'select',
		label: 'Output',
		options: [
			{ value: 'same', label: 'Same format' },
			{ value: 'webp', label: 'WebP' }
		],
		default: 'same'
	},
	stripMetadata: { type: 'boolean', label: 'Strip metadata', default: true }
} satisfies SettingsSchema;

describe('parseSettings', () => {
	it('fills every missing field with its default', () => {
		expect(parseSettings(compress, {})).toEqual({
			ok: true,
			value: { quality: 80, output: 'same', stripMetadata: true }
		});
	});

	it('converts query-string values to their field types and ignores other keys', () => {
		const raw = { quality: '60', output: 'webp', stripMetadata: 'false', filename: 'a.jpg' };

		expect(parseSettings(compress, raw)).toEqual({
			ok: true,
			value: { quality: 60, output: 'webp', stripMetadata: false }
		});
	});

	it('rejects invalid values with one message per field', () => {
		const raw = { quality: '150', output: 'bmp', stripMetadata: 'yes' };

		expect(parseSettings(compress, raw)).toEqual({
			ok: false,
			errors: {
				quality: 'Quality must be a number from 1 to 100.',
				output: 'Output must be one of: same, webp.',
				stripMetadata: 'Strip metadata must be true or false.'
			}
		});
	});

	it('rejects a number field that is not a number', () => {
		expect(parseSettings(compress, { quality: 'high' })).toEqual({
			ok: false,
			errors: { quality: 'Quality must be a number from 1 to 100.' }
		});
	});
});
