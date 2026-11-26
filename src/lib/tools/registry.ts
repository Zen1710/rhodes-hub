import type { Category, Tool, ToolMeta } from './types';

/** Every Category in display order. A Tool folder outside these is an error. */
export const CATEGORIES = [
	{ id: 'image', name: 'Image', note: 'sharp · Light lane' },
	{ id: 'music', name: 'Music', note: 'ffmpeg and AI models' }
] as const;

const REQUIRED: (keyof ToolMeta)[] = [
	'name',
	'description',
	'keywords',
	'lane',
	'accepts',
	'maxBytes',
	'dependencies',
	'settings'
];

const TOOL_PATH = /\/tools\/([a-z0-9-]+)\/([a-z0-9-]+)\/meta\.ts$/;

export interface Registry {
	tools: Tool[];
	categories: Category[];
	get(id: string): Tool | undefined;
}

/** Builds the Tool registry from `src/tools/<category>/<tool>/meta.ts` modules. */
export function buildRegistry(modules: Record<string, { default: ToolMeta }>): Registry {
	const tools: Tool[] = Object.entries(modules).map(([path, module]) => {
		const match = TOOL_PATH.exec(path);
		if (!match) throw new Error(`Tool meta at unexpected path: ${path}`);
		const [, category, slug] = match;
		const id = `${category}/${slug}`;
		if (!CATEGORIES.some((c) => c.id === category)) {
			throw new Error(`Unknown Category "${category}" for Tool ${id}`);
		}
		const missing = REQUIRED.filter((key) => module.default?.[key] === undefined);
		if (missing.length > 0) throw new Error(`Tool ${id} is missing: ${missing.join(', ')}`);
		return { ...module.default, id, category, slug };
	});

	const categories: Category[] = CATEGORIES.map(({ id, name, note }) => ({
		id,
		name,
		note,
		tools: tools
			.filter((tool) => tool.category === id)
			.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name))
	}));

	const byId = new Map(tools.map((tool) => [tool.id, tool]));
	return { tools, categories, get: (id) => byId.get(id) };
}
