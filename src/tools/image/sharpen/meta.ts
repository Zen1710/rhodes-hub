import { defineTool } from '#lib/tools/types.ts';

export default defineTool({
	name: 'Sharpen',
	description: 'Recover detail in soft photos.',
	keywords: ['sharpen', 'detail', 'blur', 'soft', 'scan', 'enhance', 'heic'],
	lane: 'light',
	order: 4,
	accepts: { extensions: ['jpg', 'jpeg', 'png', 'webp', 'heic'], noun: 'image' },
	maxBytes: 50 * 1024 * 1024,
	dependencies: [],
	settings: {
		strength: {
			type: 'select',
			label: 'Strength',
			options: [
				{ value: 'low', label: 'Low' },
				{ value: 'medium', label: 'Medium' },
				{ value: 'high', label: 'High' }
			],
			default: 'medium'
		},
		radius: {
			type: 'number',
			label: 'Radius',
			min: 0.3,
			max: 5,
			step: 0.1,
			unit: 'px',
			default: 1
		},
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
		}
	}
});
