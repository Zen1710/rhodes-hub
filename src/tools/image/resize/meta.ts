import { defineTool } from '#lib/tools/types.ts';

export default defineTool({
	name: 'Resize',
	description: 'Scale to exact pixels or a percentage.',
	keywords: ['resize', 'scale', 'dimensions', 'width', 'height', 'smaller', 'heic'],
	lane: 'light',
	order: 2,
	accepts: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'], noun: 'image' },
	maxBytes: 50 * 1024 * 1024,
	dependencies: [],
	settings: {
		mode: {
			type: 'select',
			label: 'Resize by',
			options: [
				{ value: 'pixels', label: 'Pixels' },
				{ value: 'percent', label: 'Percentage' }
			],
			default: 'pixels'
		},
		width: {
			type: 'number',
			label: 'Width',
			min: 0,
			max: 20000,
			unit: 'px',
			default: 1280,
			hint: '0 keeps the ratio from the height.'
		},
		height: {
			type: 'number',
			label: 'Height',
			min: 0,
			max: 20000,
			unit: 'px',
			default: 0,
			hint: '0 keeps the ratio from the width.'
		},
		percent: { type: 'number', label: 'Percentage', min: 1, max: 400, unit: '%', default: 50 }
	}
});
