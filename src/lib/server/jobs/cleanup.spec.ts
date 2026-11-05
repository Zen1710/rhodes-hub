import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupExpired } from './cleanup';
import { createJobQueue } from './queue';
import { createJobStorage } from './storage';

const HOUR = 60 * 60 * 1000;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let root: string;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'rhodes-cleanup-'));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe('cleanupExpired', () => {
	it('deletes Jobs that finished more than 24 hours ago, in memory and on disk', async () => {
		let now = 0;
		const queue = createJobQueue({ heavy: 1, light: 2 }, { now: () => now });
		const storage = createJobStorage(root);
		const finish = (output: string) => () => Promise.resolve(output);
		const never = () => new Promise<string>(() => {});

		const old = queue.submit({
			toolId: 'm',
			lane: 'light',
			input: 'a',
			settings: {},
			run: finish('a')
		});
		await flush();
		now = 23 * HOUR;
		const recent = queue.submit({
			toolId: 'm',
			lane: 'light',
			input: 'b',
			settings: {},
			run: finish('b')
		});
		await flush();
		const running = queue.submit({
			toolId: 'm',
			lane: 'heavy',
			input: 'c',
			settings: {},
			run: never
		});
		await flush();
		for (const job of [old, recent, running]) await storage.prepare(job.id);

		now = 25 * HOUR;
		const removed = await cleanupExpired({ queue, storage, now: now });

		expect(removed).toEqual([old.id]);
		expect(queue.get(old.id)).toBeUndefined();
		expect(queue.get(recent.id)?.status).toBe('done');
		expect(queue.get(running.id)?.status).toBe('running');
		expect((await readdir(root)).sort()).toEqual([recent.id, running.id].sort());
	});
});
