import { randomUUID } from 'node:crypto';

export type Lane = 'heavy' | 'light';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export interface RunContext<I, S> {
	input: I;
	settings: S;
	signal: AbortSignal;
	reportProgress: (progress: number) => void;
}

export interface JobSpec<I, S, O> {
	toolId: string;
	lane: Lane;
	input: I;
	settings: S;
	run: (ctx: RunContext<I, S>) => Promise<O>;
}

export interface Job<O = unknown> {
	id: string;
	toolId: string;
	lane: Lane;
	status: JobStatus;
	progress: number;
	output?: O;
	error?: string;
}

interface Entry {
	job: Job;
	spec: JobSpec<unknown, unknown, unknown>;
	controller?: AbortController;
}

export function createJobQueue(limits: Record<Lane, number>) {
	const entries = new Map<string, Entry>();
	const waiting: Record<Lane, string[]> = { heavy: [], light: [] };
	const running: Record<Lane, number> = { heavy: 0, light: 0 };

	function pump(lane: Lane) {
		while (running[lane] < limits[lane] && waiting[lane].length > 0) {
			const id = waiting[lane].shift()!;
			start(entries.get(id)!);
		}
	}

	function start(entry: Entry) {
		const { job, spec } = entry;
		job.status = 'running';
		running[job.lane]++;
		const controller = new AbortController();
		entry.controller = controller;
		spec
			.run({
				input: spec.input,
				settings: spec.settings,
				signal: controller.signal,
				reportProgress: (progress) => {
					job.progress = progress;
				}
			})
			.then(
				(output) => {
					if (job.status === 'canceled') return;
					job.status = 'done';
					job.progress = 1;
					job.output = output;
				},
				(error: unknown) => {
					if (job.status === 'canceled') return;
					job.status = 'failed';
					job.error = error instanceof Error ? error.message : String(error);
				}
			)
			.finally(() => {
				running[job.lane]--;
				pump(job.lane);
			});
	}

	function submit<I, S, O>(spec: JobSpec<I, S, O>): Job<O> {
		const job: Job<O> = {
			id: randomUUID(),
			toolId: spec.toolId,
			lane: spec.lane,
			status: 'queued',
			progress: 0
		};
		entries.set(job.id, { job, spec: spec as JobSpec<unknown, unknown, unknown> });
		waiting[spec.lane].push(job.id);
		pump(spec.lane);
		return { ...job };
	}

	return {
		submit,

		retry(id: string): Job | undefined {
			const entry = entries.get(id);
			if (entry?.job.status !== 'failed') return undefined;
			return submit(entry.spec);
		},

		cancel(id: string): void {
			const entry = entries.get(id);
			if (!entry) return;
			if (entry.job.status === 'queued') {
				const lane = waiting[entry.job.lane];
				lane.splice(lane.indexOf(id), 1);
				entry.job.status = 'canceled';
			} else if (entry.job.status === 'running') {
				entry.job.status = 'canceled';
				entry.controller?.abort();
			}
		},

		get(id: string): Job | undefined {
			const entry = entries.get(id);
			return entry ? { ...entry.job } : undefined;
		}
	};
}

export type JobQueue = ReturnType<typeof createJobQueue>;
