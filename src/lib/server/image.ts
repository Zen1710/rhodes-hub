import { readFile } from 'node:fs/promises';
import decodeHeic from 'heic-decode';
import sharp, { type Sharp } from 'sharp';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'heic';

export interface LoadedImage {
	pipeline: Sharp;
	format: ImageFormat;
	/** Upright size, after EXIF orientation. */
	width: number;
	height: number;
}

/**
 * Opens an image as a sharp pipeline. sharp's bundled libheif reads AVIF but not HEIC (HEVC),
 * so HEIC goes through heic-decode's WASM decoder first.
 */
export async function loadImage(path: string): Promise<LoadedImage> {
	const meta = await sharp(path).metadata();

	if (meta.format === 'heif' && meta.compression === 'hevc') {
		const { width, height, data } = await decodeHeic({ buffer: await readFile(path) });
		return {
			pipeline: sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
				raw: { width, height, channels: 4 }
			}),
			format: 'heic',
			width,
			height
		};
	}

	const format: ImageFormat | undefined =
		meta.format === 'heif'
			? 'avif'
			: meta.format === 'jpeg' || meta.format === 'png' || meta.format === 'webp'
				? meta.format
				: undefined;
	if (!format) throw new Error(`Unsupported image format: ${meta.format ?? 'unknown'}.`);

	return {
		pipeline: sharp(path).rotate(),
		format,
		width: meta.autoOrient?.width ?? meta.width ?? 0,
		height: meta.autoOrient?.height ?? meta.height ?? 0
	};
}

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif';

const EXTENSION: Record<OutputFormat, string> = {
	jpeg: 'jpg',
	png: 'png',
	webp: 'webp',
	avif: 'avif'
};

/**
 * Maps a Tool's output setting to a format. `same` keeps the source format, except HEIC,
 * which sharp cannot write, so it becomes JPG.
 */
export function outputFormat(setting: string, source: ImageFormat): OutputFormat {
	if (setting === 'same') return source === 'heic' ? 'jpeg' : source;
	if (setting === 'jpg') return 'jpeg';
	return setting as OutputFormat;
}

/** photo.heic + jpeg -> photo.jpg; keeps the original extension spelling when the format is unchanged. */
export function outputName(inputName: string, format: OutputFormat): string {
	const dot = inputName.lastIndexOf('.');
	const base = dot > 0 ? inputName.slice(0, dot) : inputName;
	const ext = dot > 0 ? inputName.slice(dot + 1) : '';
	const sameFormat =
		(format === 'jpeg' && /^jpe?g$/i.test(ext)) || ext.toLowerCase() === EXTENSION[format];
	return sameFormat ? inputName : `${base}.${EXTENSION[format]}`;
}

export interface EncodeOptions {
	quality: number;
	keepMetadata: boolean;
	/** Lossy PNG: reduce to a palette at this quality. Only Compress wants this. */
	quantizePng?: boolean;
}

/** Applies the encoder for `format`. PNG stays lossless unless `quantizePng` is set. */
export function encode(
	pipeline: Sharp,
	format: OutputFormat,
	{ quality, keepMetadata, quantizePng = false }: EncodeOptions
): Sharp {
	const encoded =
		format === 'jpeg'
			? pipeline.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true })
			: format === 'png'
				? pipeline.png(
						quantizePng && quality < 100
							? { palette: true, quality, compressionLevel: 9 }
							: { compressionLevel: 9 }
					)
				: format === 'webp'
					? pipeline.webp({ quality })
					: pipeline.avif({ quality });
	return keepMetadata ? encoded.keepMetadata() : encoded;
}
