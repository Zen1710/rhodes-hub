import { basename, join } from 'node:path';
import type { ToolRunner } from '#lib/server/jobs/service.ts';
import { encode, loadImage, outputFormat, outputName } from '#lib/server/image.ts';

interface Settings {
	strength: 'low' | 'medium' | 'high';
	radius: number;
	output: string;
}

/** sharp's `m1`/`m2`: how much to sharpen flat areas and edges. Medium is sharp's default. */
const AMOUNT = {
	low: { m1: 0.5, m2: 1 },
	medium: { m1: 1, m2: 2 },
	high: { m1: 2, m2: 4 }
};

const run: ToolRunner = async ({ inputPath, outputDir, settings, signal }) => {
	signal.throwIfAborted();
	const { strength, radius, output } = settings as unknown as Settings;
	const image = await loadImage(inputPath);
	const sharpened = image.pipeline.sharpen({ sigma: radius, ...AMOUNT[strength] });

	const format = outputFormat(output, image.format);
	signal.throwIfAborted();
	await encode(sharpened, format, { quality: 90, keepMetadata: false }).toFile(
		join(outputDir, outputName(basename(inputPath), format))
	);
};

export default run;
