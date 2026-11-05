import { extensionOf } from '#lib/tools/input.ts';

const TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	avif: 'image/avif',
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	flac: 'audio/flac',
	m4a: 'audio/mp4',
	ogg: 'audio/ogg',
	zip: 'application/zip'
};

export function contentTypeOf(filename: string): string {
	return TYPES[extensionOf(filename) ?? ''] ?? 'application/octet-stream';
}
