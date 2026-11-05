import { resolve } from 'node:path';
import { cleanupExpired } from './cleanup';
import { createJobQueue, type JobQueue } from './queue';
import { createJobStorage, type JobStorage } from './storage';

export * from './cleanup';
export * from './queue';
export * from './storage';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Kept on globalThis so Vite's server-module reloads in `pnpm dev` do not wipe running Jobs.
const state = globalThis as typeof globalThis & {
	__rhodesJobQueue?: JobQueue;
	__rhodesJobStorage?: JobStorage;
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
