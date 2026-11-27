/** Client-safe text helpers for the UI. */
import { extensionOf, formatBytes } from '#lib/tools/input.ts';
import type { Tool, ToolMeta } from '#lib/tools/types.ts';

const FORMAT_NAMES: Record<string, string> = { jpeg: 'JPG', webp: 'WebP' };

/** jpg → JPG, webp → WebP, m4a → M4A. */
export function formatName(extension: string): string {
	return FORMAT_NAMES[extension] ?? extension.toUpperCase();
}

/** The formats a Tool reads, without duplicates such as JPG and JPEG. */
export function formatNames(tool: Pick<ToolMeta, 'accepts'>): string[] {
	return [...new Set(tool.accepts.extensions.map(formatName))];
}

/** "Drop images here", "Drop audio files here". */
export function dropTitle(tool: Pick<ToolMeta, 'accepts'>): string {
	return `Drop ${tool.accepts.noun}s here`;
}

/** "or paste with ⌘V. JPG, PNG, WebP, HEIC up to 50 MB each." */
export function dropHint(tool: Pick<Tool, 'accepts' | 'maxBytes' | 'maxDurationSec' | 'category'>) {
	const paste = tool.category === 'image' ? 'or paste with ⌘V. ' : '';
	const minutes = tool.maxDurationSec ? ` and ${Math.round(tool.maxDurationSec / 60)} minutes` : '';
	return `${paste}${formatNames(tool).join(', ')} up to ${formatBytes(tool.maxBytes)}${minutes} each.`;
}

/** 1st, 2nd, 3rd, 4th, 11th. */
export function ordinal(n: number): string {
	const tens = n % 100;
	if (tens >= 11 && tens <= 13) return `${n}th`;
	return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
}

/** "about 3 min left" from how far a Job got in how long; nothing until there is enough to go on. */
export function timeLeft(progress: number, elapsedMs: number): string | undefined {
	if (progress < 0.05 || progress >= 1) return undefined;
	const leftMs = (elapsedMs * (1 - progress)) / progress;
	const minutes = Math.round(leftMs / 60_000);
	return minutes < 1 ? 'less than a minute left' : `about ${minutes} min left`;
}

export interface DoneResult {
	inputName: string;
	/** Unknown when the file was dropped in another browser session. */
	inputSize?: number;
	outputs: { name: string; size: number }[];
	/** Width of the output image, once it has loaded. */
	width?: number;
}

const MINUS = '−';

/** The large numeral on a done Job: −84%, WebP, 1280 px, or Done. */
export function resultNumeral(kind: ToolMeta['result'], result: DoneResult): string {
	const output = result.outputs[0];
	switch (kind) {
		case 'saving': {
			if (!result.inputSize || !output) return 'Done';
			const change = Math.round(((output.size - result.inputSize) / result.inputSize) * 100);
			return change < 0 ? `${MINUS}${-change}%` : change > 0 ? `+${change}%` : '0%';
		}
		case 'format': {
			const ext = output && extensionOf(output.name);
			return ext ? formatName(ext) : 'Done';
		}
		case 'width':
			return result.width ? `${result.width} px` : 'Done';
		default:
			return 'Done';
	}
}

/** "HEIC → WebP · 3.4 MB → 1.2 MB", or "2.4 MB → 380 KB" when the format stays. */
export function doneMeta(result: DoneResult): string {
	const outSize = result.outputs.reduce((sum, file) => sum + file.size, 0);
	const parts: string[] = [];
	const from = extensionOf(result.inputName);
	const to = result.outputs.length === 1 ? extensionOf(result.outputs[0].name) : undefined;
	if (from && to && formatName(from) !== formatName(to)) {
		parts.push(`${formatName(from)} → ${formatName(to)}`);
	}
	parts.push(
		result.inputSize
			? `${formatBytes(result.inputSize)} → ${formatBytes(outSize)}`
			: formatBytes(outSize)
	);
	return parts.join(' · ');
}

/** "Quality 60 · Width 1280 px · Same format": what a Job ran with, so results can be told apart. */
export function settingsSummary(
	tool: Pick<ToolMeta, 'settings'>,
	values: Record<string, unknown>
): string {
	return Object.entries(tool.settings)
		.filter(([key]) => key in values)
		.map(([key, field]) => {
			const value = values[key];
			if (field.type === 'select') return field.options.find((o) => o.value === value)?.label;
			if (field.type === 'number')
				return `${field.label} ${value}${field.unit ? ` ${field.unit}` : ''}`;
			return `${field.label} ${value ? 'on' : 'off'}`;
		})
		.filter(Boolean)
		.join(' · ');
}
