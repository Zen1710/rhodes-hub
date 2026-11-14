import { basename, join } from 'node:path';
import type { ToolRunner } from '#lib/server/jobs/service.ts';
import { encode, loadImage, outputFormat, outputName } from '#lib/server/image.ts';

const run: ToolRunner = async ({ inputPath, outputDir, settings, signal }) => {
	signal.throwIfAborted();
	const { to, quality, metadata } = settings as { to: string; quality: number; metadata: string };
	const image = await loadImage(inputPath);
	const format = outputFormat(to, image.format);
	signal.throwIfAborted();
	await encode(image.pipeline, format, { quality, keepMetadata: metadata === 'keep' }).toFile(
		join(outputDir, outputName(basename(inputPath), format))
	);
};

export default run;
