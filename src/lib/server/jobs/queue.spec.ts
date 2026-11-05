import { describe, expect, it } from 'vitest';
import { createJobQueue, type RunContext } from './queue';

type Call = {
	ctx: RunContext<string, Record<string, unknown>>;
	resolve: (output: string) => void;
	reject: (error: Error) => void;
};

function controlledRun() {
	const calls: Call[] = [];
	const run = (ctx: RunContext<string, Record<string, unknown>>) =>
		new Promise<string>((resolve, reject) => {
			calls.push({ ctx, resolve, reject });
		});
	return { run, calls };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('job queue', () => {
	it('runs a submitted Job right away when its Lane has a free slot', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();

		const job = queue.submit({
			toolId: 'image/compress',
			lane: 'light',
			input: 'photo.jpg',
			settings: { quality: 80 },
			run
		});
		await flush();

		expect(queue.get(job.id)?.status).toBe('running');
		expect(calls).toHaveLength(1);
		expect(calls[0].ctx.input).toBe('photo.jpg');
		expect(calls[0].ctx.settings).toEqual({ quality: 80 });
	});

	it('keeps each Lane within its limit while both Lanes run at the same time', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const light = controlledRun();
		const heavy = controlledRun();
		const submit = (lane: 'heavy' | 'light', input: string) =>
			queue.submit({
				toolId: 'any/tool',
				lane,
				input,
				settings: {},
				run: lane === 'light' ? light.run : heavy.run
			});

		const [l1, l2, l3] = ['a.jpg', 'b.jpg', 'c.jpg'].map((f) => submit('light', f));
		const [h1, h2] = ['song1.mp3', 'song2.mp3'].map((f) => submit('heavy', f));
		await flush();

		expect([l1, l2, l3, h1, h2].map((j) => queue.get(j.id)?.status)).toEqual([
			'running',
			'running',
			'queued',
			'running',
			'queued'
		]);
		expect(light.calls).toHaveLength(2);
		expect(heavy.calls).toHaveLength(1);
	});

	it('marks a finished Job done and starts the next queued Job in the same Lane', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const first = queue.submit({ toolId: 'm', lane: 'heavy', input: 'one.mp3', settings: {}, run });
		const second = queue.submit({
			toolId: 'm',
			lane: 'heavy',
			input: 'two.mp3',
			settings: {},
			run
		});
		await flush();

		calls[0].resolve('one-vocals.mp3');
		await flush();

		expect(queue.get(first.id)).toMatchObject({ status: 'done', output: 'one-vocals.mp3' });
		expect(queue.get(second.id)?.status).toBe('running');
		expect(calls[1].ctx.input).toBe('two.mp3');
	});

	it('marks a Job failed with its error message and keeps the Lane moving', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const bad = queue.submit({ toolId: 'm', lane: 'heavy', input: 'bad.png', settings: {}, run });
		const next = queue.submit({ toolId: 'm', lane: 'heavy', input: 'ok.png', settings: {}, run });
		await flush();

		calls[0].reject(new Error('Unsupported color profile (CMYK)'));
		await flush();

		expect(queue.get(bad.id)).toMatchObject({
			status: 'failed',
			error: 'Unsupported color profile (CMYK)'
		});
		expect(queue.get(next.id)?.status).toBe('running');
	});

	it('cancels a queued Job so it never runs', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const first = queue.submit({ toolId: 'm', lane: 'heavy', input: 'one.mp3', settings: {}, run });
		const second = queue.submit({
			toolId: 'm',
			lane: 'heavy',
			input: 'two.mp3',
			settings: {},
			run
		});
		const third = queue.submit({
			toolId: 'm',
			lane: 'heavy',
			input: 'three.mp3',
			settings: {},
			run
		});
		await flush();

		queue.cancel(second.id);
		calls[0].resolve('done');
		await flush();

		expect(queue.get(first.id)?.status).toBe('done');
		expect(queue.get(second.id)?.status).toBe('canceled');
		expect(queue.get(third.id)?.status).toBe('running');
		expect(calls.map((c) => c.ctx.input)).toEqual(['one.mp3', 'three.mp3']);
	});

	it('aborts a running Job and frees its slot only once the run has stopped', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const first = queue.submit({ toolId: 'm', lane: 'heavy', input: 'one.mp3', settings: {}, run });
		const second = queue.submit({
			toolId: 'm',
			lane: 'heavy',
			input: 'two.mp3',
			settings: {},
			run
		});
		await flush();

		queue.cancel(first.id);

		expect(calls[0].ctx.signal.aborted).toBe(true);
		expect(queue.get(first.id)?.status).toBe('canceled');
		expect(queue.get(second.id)?.status).toBe('queued');

		calls[0].reject(new Error('The operation was aborted'));
		await flush();

		expect(queue.get(first.id)).toMatchObject({ status: 'canceled' });
		expect(queue.get(first.id)?.error).toBeUndefined();
		expect(queue.get(second.id)?.status).toBe('running');
	});

	it('retries a failed Job as a new Job with the same input and settings', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const failed = queue.submit({
			toolId: 'image/compress',
			lane: 'light',
			input: 'scan.png',
			settings: { quality: 60 },
			run
		});
		await flush();
		calls[0].reject(new Error('Disk full'));
		await flush();

		const retried = queue.retry(failed.id);
		await flush();

		expect(retried?.id).not.toBe(failed.id);
		expect(queue.get(retried!.id)).toMatchObject({ toolId: 'image/compress', status: 'running' });
		expect(calls[1].ctx.input).toBe('scan.png');
		expect(calls[1].ctx.settings).toEqual({ quality: 60 });
		expect(queue.get(failed.id)?.status).toBe('failed');
	});

	it('exposes the progress a running Job reports', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const job = queue.submit({ toolId: 'm', lane: 'heavy', input: 'song.mp3', settings: {}, run });
		await flush();

		calls[0].ctx.reportProgress(0.48);

		expect(queue.get(job.id)).toMatchObject({ status: 'running', progress: 0.48 });
	});

	it('only retries Jobs that failed', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run } = controlledRun();
		const running = queue.submit({ toolId: 'm', lane: 'light', input: 'a.jpg', settings: {}, run });
		await flush();

		expect(queue.retry(running.id)).toBeUndefined();
		expect(queue.retry('missing-id')).toBeUndefined();
	});
	it('records when a Job finished, whether done, failed, or canceled', async () => {
		let now = 1_000;
		const queue = createJobQueue({ heavy: 1, light: 2 }, { now: () => now });
		const { run, calls } = controlledRun();
		const done = queue.submit({ toolId: 'm', lane: 'light', input: 'a', settings: {}, run });
		const failed = queue.submit({ toolId: 'm', lane: 'light', input: 'b', settings: {}, run });
		const canceled = queue.submit({ toolId: 'm', lane: 'heavy', input: 'c', settings: {}, run });
		await flush();

		expect(queue.get(done.id)?.finishedAt).toBeUndefined();

		now = 2_000;
		calls[0].resolve('out');
		calls[1].reject(new Error('boom'));
		await flush();
		now = 3_000;
		queue.cancel(canceled.id);

		expect(queue.get(done.id)?.finishedAt).toBe(2_000);
		expect(queue.get(failed.id)?.finishedAt).toBe(2_000);
		expect(queue.get(canceled.id)?.finishedAt).toBe(3_000);
	});
	it('removes finished Jobs from memory but refuses queued or running ones', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run, calls } = controlledRun();
		const finished = queue.submit({ toolId: 'm', lane: 'heavy', input: 'a', settings: {}, run });
		const running = queue.submit({ toolId: 'm', lane: 'heavy', input: 'b', settings: {}, run });
		const queued = queue.submit({ toolId: 'm', lane: 'heavy', input: 'c', settings: {}, run });
		await flush();
		calls[0].resolve('out');
		await flush();

		expect(queue.remove(finished.id)).toBe(true);
		expect(queue.remove(running.id)).toBe(false);
		expect(queue.remove(queued.id)).toBe(false);
		expect(queue.get(finished.id)).toBeUndefined();
		expect(queue.get(running.id)?.status).toBe('running');
		expect(queue.get(queued.id)?.status).toBe('queued');
	});
	it('uses the Job id the caller provides', async () => {
		const queue = createJobQueue({ heavy: 1, light: 2 });
		const { run } = controlledRun();

		const job = queue.submit({
			id: 'job-42',
			toolId: 'm',
			lane: 'light',
			input: 'a',
			settings: {},
			run
		});

		expect(job.id).toBe('job-42');
		expect(queue.get('job-42')?.toolId).toBe('m');
	});
});
