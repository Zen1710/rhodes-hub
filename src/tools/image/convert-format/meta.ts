import { defineTool } from '#lib/tools/types.ts';

export default defineTool({
	name: 'Convert format',
	description: 'Turn one image format into another.',
	keywords: ['convert', 'format', 're-encode', 'jpg', 'png', 'webp', 'avif'],
	lane: 'light',
	order: 3,
	accepts: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'], noun: 'image' },
	maxBytes: 50 * 1024 * 1024,
	dependencies: [],
	settings: {
		to: {
			type: 'select',
			label: 'Convert to',
			options: [
				{ value: 'webp', label: 'WebP' },
				{ value: 'jpg', label: 'JPG' },
				{ value: 'png', label: 'PNG' },
				{ value: 'avif', label: 'AVIF' }
			],
			default: 'webp'
		},
		quality: { type: 'number', label: 'Quality', min: 1, max: 100, default: 85 },
		metadata: {
			type: 'select',
			label: 'Metadata',
			options: [
				{ value: 'keep', label: 'Keep' },
				{ value: 'strip', label: 'Strip' }
			],
			default: 'keep'
		}
	}
});
