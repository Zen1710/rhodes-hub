import { buildRegistry } from './registry';
import type { ToolMeta } from './types';

export * from './input';
export * from './registry';
export * from './settings';
export * from './types';

/** Every Tool, built from `src/tools/<category>/<tool>/meta.ts`. Client-safe. */
export const registry = buildRegistry(
	import.meta.glob<{ default: ToolMeta }>('/src/tools/*/*/meta.ts', { eager: true })
);
