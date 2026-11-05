import type { ToolRunner } from './jobs/service';

/** Each Tool's `run.ts`, keyed by Tool id. A Tool without one is reported as not ready. */
export const runners: Record<string, ToolRunner> = Object.fromEntries(
	Object.entries(
		import.meta.glob<{ default: ToolRunner }>('/src/tools/*/*/run.ts', { eager: true })
	).map(([path, module]) => [path.split('/').slice(-3, -1).join('/'), module.default])
);
