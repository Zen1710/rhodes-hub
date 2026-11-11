import { copyFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import sharp from 'sharp';
import type { ToolRunner } from '#lib/server/jobs/service.ts';
import { encode, loadImage, outputFormat, outputName } from '#lib/server/image.ts';

/** True when the file carries EXIF, XMP, or IPTC data that "Strip" promises to remove. */
async function hasMetadata(path: string): Promise<boolean> {
	const { exif, xmp, iptc } = await sharp(path).metadata();
	return Boolean(exif || xmp || iptc);
}

const run: ToolRunner = async ({ inputPath, outputDir, settings, signal }) => {
	signal.throwIfAborted();
	const { quality, output, metadata } = settings as {
		quality: number;
		output: string;
		metadata: 'strip' | 'keep';
	};
	const image = await loadImage(inputPath);
	const format = outputFormat(output, image.format);
	const outputPath = join(outputDir, outputName(basename(inputPath), format));
	signal.throwIfAborted();
	const encoded = await encode(image.pipeline, format, {
		quality,
		keepMetadata: metadata === 'keep',
		quantizePng: true
	}).toBuffer();
	signal.throwIfAborted();

	// An already optimized file can grow when re-encoded. Hand back the original instead,
	// unless the format changes or the original still holds metadata the user asked to strip.
	const grew = encoded.byteLength >= (await stat(inputPath)).size;
	const originalFits =
		format === image.format && (metadata === 'keep' || !(await hasMetadata(inputPath)));
	if (grew && originalFits) await copyFile(inputPath, outputPath);
	else await writeFile(outputPath, encoded);
};

export default run;
