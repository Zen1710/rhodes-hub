import type { Registry } from '#lib/tools/registry.ts';
import type { Dependency } from '#lib/tools/types.ts';
import type { ToolRunner } from './jobs/service';

/** Runs a command and resolves true when it exits successfully. */
export type Probe = (command: string, args: string[]) => Promise<boolean>;

export type DependencyStatus = { ok: true } | { ok: false; problem: string; fix: string };

export const PYTHON = 'python/.venv/bin/python';

const CHECKS: Record<
	Dependency,
	{ command: string; args: string[]; problem: string; fix: string }
> = {
	ffmpeg: {
		command: 'ffmpeg',
		args: ['-version'],
		problem: 'ffmpeg is not installed.',
		fix: 'brew install ffmpeg'
	},
	ffprobe: {
		command: 'ffprobe',
		args: ['-version'],
		problem: 'ffprobe is not installed.',
		fix: 'brew install ffmpeg'
	},
	'vocal-separator': {
		command: PYTHON,
		args: ['python/separate.py', '--check'],
		problem: 'The vocal separation model is not set up.',
		fix: 'pnpm run setup'
	}
};

/** Checks every external dependency once; run when the server starts. */
export async function checkDependencies(
	probe: Probe
): Promise<Record<Dependency, DependencyStatus>> {
	const entries = await Promise.all(
		Object.entries(CHECKS).map(async ([name, check]) => {
			const ok = await probe(check.command, check.args);
			const status: DependencyStatus = ok
				? { ok: true }
				: { ok: false, problem: check.problem, fix: check.fix };
			return [name, status] as const;
		})
	);
	return Object.fromEntries(entries) as Record<Dependency, DependencyStatus>;
}

export type Readiness = { ready: true } | { ready: false; problem: string; fix?: string };

/** Whether each Tool can run: it needs a `run.ts` and every dependency it declares. */
export function toolReadiness(
	registry: Registry,
	statuses: Record<Dependency, DependencyStatus>,
	runners: Record<string, ToolRunner>
): Record<string, Readiness> {
	return Object.fromEntries(
		registry.tools.map((tool) => {
			if (!runners[tool.id]) {
				return [tool.id, { ready: false, problem: 'This Tool is not built yet.' }];
			}
			const missing = tool.dependencies.map((dep) => statuses[dep]).find((status) => !status.ok);
			return [
				tool.id,
				missing && !missing.ok
					? { ready: false, problem: missing.problem, fix: missing.fix }
					: { ready: true }
			];
		})
	);
}
