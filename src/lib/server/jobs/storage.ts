import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

export interface JobPaths {
	input: string;
	output: string;
}

/** Per-Job folders under `root`: `<root>/<jobId>/input` and `<root>/<jobId>/output`. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

function assertSafeId(jobId: string) {
	if (!SAFE_ID.test(jobId)) throw new Error(`Invalid Job id: ${JSON.stringify(jobId)}`);
}

export function createJobStorage(root: string) {
	const pathsFor = (jobId: string): JobPaths => ({
		input: join(root, jobId, 'input'),
		output: join(root, jobId, 'output')
	});

	return {
		async prepare(jobId: string): Promise<JobPaths> {
			assertSafeId(jobId);
			const paths = pathsFor(jobId);
			await mkdir(paths.input, { recursive: true });
			await mkdir(paths.output, { recursive: true });
			return paths;
		},

		async remove(jobId: string): Promise<void> {
			assertSafeId(jobId);
			await rm(join(root, jobId), { recursive: true, force: true });
		},

		async wipe(): Promise<void> {
			await rm(root, { recursive: true, force: true });
			await mkdir(root, { recursive: true });
		}
	};
}

export type JobStorage = ReturnType<typeof createJobStorage>;
