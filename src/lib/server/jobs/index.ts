import { resolve } from 'node:path';
import { cleanupExpired } from './cleanup';
import { createJobQueue, type JobQueue } from './queue';
import { createJobStorage, type JobStorage } from './storage';
import { createJobService, type JobService } from './service';
import { registry } from '../../tools/index.ts';
import { runners } from '../tools.ts';
import { checkDependencies, toolReadiness, type Readiness } from '../dependencies.ts';
import { spawnProbe } from '../probe.ts';

export * from './cleanup';
export * from './queue';
export * from './service';
export * from './storage';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Kept on globalThis so Vite's server-module reloads in `pnpm dev` do not wipe running Jobs.
const state = globalThis as typeof globalThis & {
	__rhodesJobQueue?: JobQueue;
	__rhodesJobStorage?: JobStorage;
	__rhodesJobService?: JobService;
	__rhodesReadiness?: Record<string, Readiness>;
	__rhodesJobsStarted?: boolean;
};

export function getJobQueue(): JobQueue {
	state.__rhodesJobQueue ??= createJobQueue({ heavy: 1, light: 2 });
	return state.__rhodesJobQueue;
}

export function getJobStorage(): JobStorage {
	state.__rhodesJobStorage ??= createJobStorage(resolve('.data/jobs'));
	return state.__rhodesJobStorage;
}

export function getJobService(): JobService {
	state.__rhodesJobService ??= createJobService({
		queue: getJobQueue(),
		storage: getJobStorage(),
		registry,
		runners,
		readiness: getReadiness()
	});
	return state.__rhodesJobService;
}

/** Per-Tool readiness from the startup dependency check. */
export function getReadiness(): Record<string, Readiness> {
	return state.__rhodesReadiness ?? {};
}

/** Runs once per process: wipes files left by the previous run, checks dependencies, then cleans up expired Jobs every hour. */
export async function startJobs(): Promise<void> {
	if (state.__rhodesJobsStarted) return;
	state.__rhodesJobsStarted = true;

	await getJobStorage().wipe();
	state.__rhodesReadiness = toolReadiness(registry, await checkDependencies(spawnProbe), runners);
	for (const [id, status] of Object.entries(state.__rhodesReadiness)) {
		if (!status.ready)
			console.warn(`Not ready: ${id}: ${status.problem}${status.fix ? ` Fix: ${status.fix}` : ''}`);
	}
	setInterval(() => {
		cleanupExpired({ queue: getJobQueue(), storage: getJobStorage(), now: Date.now() }).catch(
			(error) => console.error('Job cleanup failed:', error)
		);
	}, CLEANUP_INTERVAL_MS).unref();
}
