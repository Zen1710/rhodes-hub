import { basename, join } from 'node:path';
import type { ToolRunner } from '#lib/server/jobs/service.ts';
import { encode, loadImage, outputFormat, outputName } from '#lib/server/image.ts';

interface Settings {
	mode: 'pixels' | 'percent';
	width: number;
	height: number;
	percent: number;
}

const run: ToolRunner = async ({ inputPath, outputDir, settings, signal }) => {
	signal.throwIfAborted();
	const { mode, width, height, percent } = settings as unknown as Settings;
	if (mode === 'pixels' && width === 0 && height === 0) throw new Error('Set a width or a height.');

	const image = await loadImage(inputPath);
	const resized =
		mode === 'percent'
			? image.pipeline.resize(
					Math.max(1, Math.round((image.width * percent) / 100)),
					Math.max(1, Math.round((image.height * percent) / 100))
				)
			: image.pipeline.resize(width || null, height || null, { fit: 'cover', position: 'centre' });

	const format = outputFormat('same', image.format);
	signal.throwIfAborted();
	await encode(resized, format, { quality: 90, keepMetadata: false }).toFile(
		join(outputDir, outputName(basename(inputPath), format))
	);
};

export default run;
