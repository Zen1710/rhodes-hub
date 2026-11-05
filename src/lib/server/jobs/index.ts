import { resolve } from 'node:path';
import { cleanupExpired } from './cleanup';
import { createJobQueue, type JobQueue } from './queue';
import { createJobStorage, type JobStorage } from './storage';
import { createJobService, type JobService } from './service';
import { registry } from '../../tools/index.ts';
import { runners } from '../tools.ts';

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
		runners
	});
	return state.__rhodesJobService;
}

/** Runs once per process: wipes files left by the previous run, then cleans up expired Jobs every hour. */
export async function startJobs(): Promise<void> {
	if (state.__rhodesJobsStarted) return;
	state.__rhodesJobsStarted = true;

	await getJobStorage().wipe();
	setInterval(() => {
		cleanupExpired({ queue: getJobQueue(), storage: getJobStorage(), now: Date.now() }).catch(
			(error) => console.error('Job cleanup failed:', error)
		);
	}, CLEANUP_INTERVAL_MS).unref();
}
