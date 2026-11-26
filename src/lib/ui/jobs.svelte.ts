/**
 * The Jobs started from this browser. The server has no Job list endpoint, so the ids are kept in
 * localStorage and each active Job is polled. Files that never became a Job ("Not added") and the
 * File objects themselves live only in memory.
 */
import { checkInput, extensionOf } from '#lib/tools/input.ts';
import type { Tool } from '#lib/tools/types.ts';
import type { JobView } from '#lib/server/jobs/service.ts';

export type EntryState =
	'not-added' | 'waiting' | 'uploading' | 'queued' | 'running' | 'done' | 'failed' | 'canceled';

export interface Entry {
	key: string;
	toolId: string;
	filename: string;
	inputSize?: number;
	state: EntryState;
	/** Why a file was not added or its upload failed. */
	reason?: string;
	uploaded?: number;
	job?: JobView;
	/** When this browser first saw the Job running, for the time-left estimate. */
	runningSince?: number;
	/** The dropped file, kept for Compare; gone after a reload. */
	file?: File;
}

interface Saved {
	key: string;
	toolId: string;
	filename: string;
	inputSize?: number;
	jobId: string;
}

const STORAGE_KEY = 'rhodes:jobs';
const POLL_MS = 800;
const ACTIVE: EntryState[] = ['waiting', 'uploading', 'queued', 'running'];

function readSaved(): Saved[] {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
	} catch {
		return [];
	}
}

/** How long a song plays, read by the browser; undefined when it cannot tell. */
function audioDuration(file: File): Promise<number | undefined> {
	return new Promise((resolve) => {
		const audio = new Audio();
		const url = URL.createObjectURL(file);
		const done = (value?: number) => {
			URL.revokeObjectURL(url);
			resolve(value);
		};
		audio.onloadedmetadata = () =>
			done(Number.isFinite(audio.duration) ? audio.duration : undefined);
		audio.onerror = () => done(undefined);
		audio.src = url;
	});
}

async function errorMessage(response: Response): Promise<string> {
	try {
		return (await response.json()).error ?? `The server answered ${response.status}.`;
	} catch {
		return `The server answered ${response.status}.`;
	}
}

class Jobs {
	entries = $state<Entry[]>([]);
	#uploads: Promise<void> = Promise.resolve();
	#requests = new Map<string, XMLHttpRequest>();
	#timer?: ReturnType<typeof setInterval>;

	/** Restores saved Jobs and starts polling. Call once, in the browser. */
	start() {
		if (this.#timer) return;
		this.entries = readSaved().map((saved) => ({
			key: saved.key,
			toolId: saved.toolId,
			filename: saved.filename,
			inputSize: saved.inputSize,
			state: 'queued',
			job: { id: saved.jobId } as JobView
		}));
		this.#poll();
		this.#timer = setInterval(() => this.#poll(), POLL_MS);
	}

	forTool(toolId: string): Entry[] {
		return this.entries.filter((entry) => entry.toolId === toolId);
	}

	/** Queued or running on the server, or still uploading. */
	active(toolId?: string): Entry[] {
		return this.entries.filter(
			(entry) => ACTIVE.includes(entry.state) && (!toolId || entry.toolId === toolId)
		);
	}

	/** Checks each file, then uploads the accepted ones one after another. */
	async add(tool: Tool, files: File[], settings: Record<string, unknown>, fromFolder = false) {
		for (const file of files) {
			const ext = extensionOf(file.name);
			if (fromFolder && (!ext || !tool.accepts.extensions.includes(ext))) continue;
			const durationSec = tool.maxDurationSec ? await audioDuration(file) : undefined;
			const check = checkInput(tool, { filename: file.name, size: file.size, durationSec });
			const entry: Entry = {
				key: crypto.randomUUID(),
				toolId: tool.id,
				filename: file.name,
				inputSize: file.size,
				file,
				state: check.ok ? 'waiting' : 'not-added',
				reason: check.ok ? undefined : check.reason
			};
			this.entries.push(entry);
			if (check.ok) {
				const key = entry.key;
				this.#uploads = this.#uploads.then(() => this.#upload(key, tool, settings));
			}
		}
	}

	async cancel(key: string) {
		const entry = this.#find(key);
		if (!entry) return;
		if (entry.state === 'waiting') {
			entry.state = 'canceled';
		} else if (entry.state === 'uploading') {
			this.#requests.get(key)?.abort();
		} else if (entry.job && (entry.state === 'queued' || entry.state === 'running')) {
			const response = await fetch(`/api/jobs/${entry.job.id}/cancel`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' }
			});
			if (response.ok) this.#update(entry, await response.json());
		}
	}

	async retry(key: string) {
		const entry = this.#find(key);
		if (!entry?.job) return;
		const response = await fetch(`/api/jobs/${entry.job.id}/retry`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' }
		});
		if (!response.ok) {
			entry.reason = await errorMessage(response);
			return;
		}
		entry.runningSince = undefined;
		this.#update(entry, await response.json());
		this.#save();
	}

	#find(key: string): Entry | undefined {
		return this.entries.find((entry) => entry.key === key);
	}

	#upload(key: string, tool: Tool, settings: Record<string, unknown>): Promise<void> {
		const entry = this.#find(key);
		if (!entry?.file || entry.state !== 'waiting') return Promise.resolve();
		const query = Object.entries({ filename: entry.filename, ...settings })
			.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`)
			.join('&');

		entry.state = 'uploading';
		entry.uploaded = 0;
		return new Promise((resolve) => {
			const xhr = new XMLHttpRequest();
			this.#requests.set(key, xhr);
			xhr.open('POST', `/api/tools/${tool.id}?${query}`);
			xhr.setRequestHeader('content-type', 'application/octet-stream');
			xhr.upload.onprogress = (event) => (entry.uploaded = event.loaded);
			xhr.onload = () => {
				let body: { error?: string } & Partial<JobView> = {};
				try {
					body = JSON.parse(xhr.responseText);
				} catch {
					// Not JSON: fall back to the status code below.
				}
				if (xhr.status === 202 && body.id) {
					this.#update(entry, body as JobView);
					this.#save();
				} else {
					entry.state = 'not-added';
					entry.reason = body.error ?? `The server answered ${xhr.status}.`;
				}
			};
			xhr.onerror = () => {
				entry.state = 'not-added';
				entry.reason = 'The upload stopped. Is Rhodes Hub still running?';
			};
			xhr.onabort = () => (entry.state = 'canceled');
			xhr.onloadend = () => {
				this.#requests.delete(key);
				resolve();
			};
			xhr.send(entry.file);
		});
	}

	#update(entry: Entry, job: JobView) {
		entry.job = job;
		entry.state = job.status;
		if (job.status === 'running') entry.runningSince ??= Date.now();
	}

	async #poll() {
		const due = this.entries.filter(
			(entry) => entry.job && (entry.state === 'queued' || entry.state === 'running')
		);
		await Promise.all(
			due.map(async (entry) => {
				try {
					const response = await fetch(`/api/jobs/${entry.job!.id}`);
					if (response.status === 404) {
						// The server restarted or the Job expired: its files are gone.
						this.entries = this.entries.filter((e) => e.key !== entry.key);
						this.#save();
					} else if (response.ok) {
						this.#update(entry, await response.json());
					}
				} catch {
					// The server is down for a moment; try again on the next tick.
				}
			})
		);
	}

	#save() {
		const saved: Saved[] = this.entries
			.filter((entry) => entry.job)
			.map(({ key, toolId, filename, inputSize, job }) => ({
				key,
				toolId,
				filename,
				inputSize,
				jobId: job!.id
			}));
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
		} catch {
			// Storage is full or blocked; Jobs still work until the tab closes.
		}
	}
}

export const jobs = new Jobs();

/** Per-Tool settings, remembered in this browser. */
export function loadSettings(tool: Tool): Record<string, unknown> {
	const defaults = Object.fromEntries(
		Object.entries(tool.settings).map(([key, field]) => [key, field.default])
	);
	try {
		const saved = JSON.parse(localStorage.getItem(`rhodes:settings:${tool.id}`) ?? '{}');
		for (const key of Object.keys(defaults)) if (key in saved) defaults[key] = saved[key];
	} catch {
		// Use the defaults.
	}
	return defaults;
}

export function saveSettings(tool: Tool, values: Record<string, unknown>) {
	try {
		localStorage.setItem(`rhodes:settings:${tool.id}`, JSON.stringify(values));
	} catch {
		// Not remembered; the values still apply to this visit.
	}
}
