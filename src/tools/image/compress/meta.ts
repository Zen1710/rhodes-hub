import { defineTool } from '#lib/tools/types.ts';

export default defineTool({
	name: 'Compress',
	description: 'Shrink file size, keep the look.',
	keywords: ['compress', 'shrink', 'optimize', 'reduce size', 'jpg', 'png', 'webp', 'heic'],
	lane: 'light',
	order: 1,
	result: 'saving',
	accepts: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'], noun: 'image' },
	maxBytes: 50 * 1024 * 1024,
	dependencies: [],
	settings: {
		quality: { type: 'number', label: 'Quality', min: 1, max: 100, default: 80 },
		output: {
			type: 'select',
			label: 'Output',
			options: [
				{ value: 'same', label: 'Same format' },
				{ value: 'jpg', label: 'JPG' },
				{ value: 'webp', label: 'WebP' },
				{ value: 'png', label: 'PNG' }
			],
			default: 'same'
		},
		metadata: {
			type: 'select',
			label: 'Metadata',
			options: [
				{ value: 'strip', label: 'Strip' },
				{ value: 'keep', label: 'Keep' }
			],
			default: 'strip'
		}
	}
});
