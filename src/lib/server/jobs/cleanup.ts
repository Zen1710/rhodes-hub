import type { JobQueue } from './queue';
import type { JobStorage } from './storage';

export const RESULT_LIFETIME_MS = 24 * 60 * 60 * 1000;

interface CleanupOptions {
	queue: JobQueue;
	storage: JobStorage;
	now: number;
	maxAgeMs?: number;
}

/** Deletes Jobs that finished more than `maxAgeMs` ago, from memory and disk. Returns their ids. */
export async function cleanupExpired({
	queue,
	storage,
	now,
	maxAgeMs = RESULT_LIFETIME_MS
}: CleanupOptions): Promise<string[]> {
	const expired = queue
		.list()
		.filter((job) => job.finishedAt !== undefined && now - job.finishedAt > maxAgeMs);

	for (const job of expired) {
		queue.remove(job.id);
		await storage.remove(job.id);
	}
	return expired.map((job) => job.id);
}
