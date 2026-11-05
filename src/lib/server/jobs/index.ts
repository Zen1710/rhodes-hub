import { createJobQueue, type JobQueue } from './queue';

export * from './queue';

const globalForJobs = globalThis as typeof globalThis & { __rhodesJobQueue?: JobQueue };

/** The app-wide Job queue, kept on globalThis so Vite's server-module reloads in dev do not wipe it. */
export function getJobQueue(): JobQueue {
	globalForJobs.__rhodesJobQueue ??= createJobQueue({ heavy: 1, light: 2 });
	return globalForJobs.__rhodesJobQueue;
}
