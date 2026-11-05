import { mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createJobStorage } from './storage';

let root: string;

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), 'rhodes-jobs-'));
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

const isDir = async (path: string) => (await stat(path)).isDirectory();

describe('job storage', () => {
	it('prepares an input and an output folder for a Job', async () => {
		const storage = createJobStorage(root);

		const paths = await storage.prepare('job-1');

		expect(paths).toEqual({
			input: join(root, 'job-1', 'input'),
			output: join(root, 'job-1', 'output')
		});
		expect(await isDir(paths.input)).toBe(true);
		expect(await isDir(paths.output)).toBe(true);
	});

	it('removes one Job folder with its files and leaves other Jobs alone', async () => {
		const storage = createJobStorage(root);
		const one = await storage.prepare('job-1');
		await storage.prepare('job-2');
		await writeFile(join(one.output, 'half-done.jpg'), 'partial');

		await storage.remove('job-1');

		expect(await readdir(root)).toEqual(['job-2']);
	});

	it('wipes every Job folder, as on server start', async () => {
		const storage = createJobStorage(root);
		const one = await storage.prepare('job-1');
		await storage.prepare('job-2');
		await writeFile(join(one.input, 'photo.jpg'), 'bytes');

		await storage.wipe();

		expect(await readdir(root)).toEqual([]);
	});

	it('refuses Job ids that could point outside its root', async () => {
		const storage = createJobStorage(join(root, 'jobs'));
		await writeFile(join(root, 'keep.txt'), 'outside the jobs folder');

		for (const id of ['..', '../..', 'a/b', '', '.']) {
			await expect(storage.remove(id)).rejects.toThrow('Invalid Job id');
			await expect(storage.prepare(id)).rejects.toThrow('Invalid Job id');
		}
		expect(await readdir(root)).toEqual(['keep.txt']);
	});
});
