import type { InputRules } from './types';

export type InputCheck = { ok: true } | { ok: false; reason: string };

export interface InputFile {
	filename: string;
	size: number;
	durationSec?: number;
}

export function extensionOf(filename: string): string | undefined {
	const dot = filename.lastIndexOf('.');
	return dot > 0 ? filename.slice(dot + 1).toLowerCase() : undefined;
}

const MB = 1024 * 1024;

/** 72 MB, 4.5 MB, 380 KB, in binary units (1 MB = 1024 KB). */
export function formatBytes(bytes: number): string {
	if (bytes >= MB) {
		const mb = bytes / MB;
		return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
	}
	return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** 1 h 52 min, 16 min 30 s, 45 s. */
export function formatDuration(totalSec: number): string {
	const sec = Math.round(totalSec);
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	if (h > 0) return m > 0 ? `${h} h ${m} min` : `${h} h`;
	if (m > 0) return s > 0 ? `${m} min ${s} s` : `${m} min`;
	return `${s} s`;
}

/** Decides whether a Tool accepts a file. Runs in the browser before upload and again on the server. */
export function checkInput(rules: InputRules, file: InputFile): InputCheck {
	const ext = extensionOf(file.filename);
	if (!ext) return { ok: false, reason: 'This file has no extension, so its format is unknown.' };
	if (!rules.accepts.extensions.includes(ext)) {
		return {
			ok: false,
			reason: `${ext.toUpperCase()} is not an ${rules.accepts.noun} this Tool reads.`
		};
	}
	if (file.size > rules.maxBytes) {
		return {
			ok: false,
			reason: `${formatBytes(file.size)} is over the ${formatBytes(rules.maxBytes)} limit.`
		};
	}
	if (
		rules.maxDurationSec !== undefined &&
		file.durationSec !== undefined &&
		file.durationSec > rules.maxDurationSec
	) {
		return {
			ok: false,
			reason: `${formatDuration(file.durationSec)} is over the ${Math.round(rules.maxDurationSec / 60)}-minute limit.`
		};
	}
	return { ok: true };
}
