import { describe, expect, it } from 'vitest';
import { buildRegistry } from './registry';
import type { ToolMeta } from './types';

const MB = 1024 * 1024;

function meta(name: string, overrides: Partial<ToolMeta> = {}): ToolMeta {
	return {
		name,
		description: `${name} description`,
		keywords: [],
		lane: 'light',
		accepts: { extensions: ['jpg'], noun: 'image' },
		maxBytes: 50 * MB,
		dependencies: [],
		settings: {},
		...overrides
	};
}

const modules = {
	'/src/tools/music/remove-vocal/meta.ts': { default: meta('Remove vocal', { order: 1 }) },
	'/src/tools/image/resize/meta.ts': { default: meta('Resize', { order: 2 }) },
	'/src/tools/image/compress/meta.ts': { default: meta('Compress', { order: 1 }) }
};

describe('buildRegistry', () => {
	it('derives each Tool id from its folder and groups Tools by Category in a fixed order', () => {
		const registry = buildRegistry(modules);

		expect(registry.categories.map((c) => [c.id, c.name, c.tools.map((t) => t.id)])).toEqual([
			['image', 'Image', ['image/compress', 'image/resize']],
			['music', 'Music', ['music/remove-vocal']]
		]);
		expect(registry.get('image/resize')).toMatchObject({
			id: 'image/resize',
			category: 'image',
			slug: 'resize',
			name: 'Resize'
		});
		expect(registry.get('image/missing')).toBeUndefined();
	});

	it('fails loudly on an unknown Category folder or an incomplete meta', () => {
		expect(() =>
			buildRegistry({ '/src/tools/video/trim/meta.ts': { default: meta('Trim') } })
		).toThrow('Unknown Category "video" for Tool video/trim');

		const incomplete = { ...meta('Sharpen'), lane: undefined } as unknown as ToolMeta;
		expect(() =>
			buildRegistry({ '/src/tools/image/sharpen/meta.ts': { default: incomplete } })
		).toThrow('Tool image/sharpen is missing: lane');
	});
});
