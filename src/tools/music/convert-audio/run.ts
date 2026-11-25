import { spawn } from 'node:child_process';
import { basename, extname, join } from 'node:path';
import type { ToolRunner } from '#lib/server/jobs/service.ts';

interface Settings {
	format: 'mp3' | 'm4a' | 'ogg' | 'flac' | 'wav';
	bitrate: string;
	sampleRate: string;
}

/** OGG uses Opus: Homebrew's ffmpeg has no libvorbis, and Opus only runs at 48 kHz. */
const CODEC = {
	mp3: { codec: 'libmp3lame', lossy: true },
	m4a: { codec: 'aac', lossy: true },
	ogg: { codec: 'libopus', lossy: true },
	flac: { codec: 'flac', lossy: false },
	wav: { codec: 'pcm_s16le', lossy: false }
};

const run: ToolRunner = async ({ inputPath, outputDir, settings, signal }) => {
	signal.throwIfAborted();
	const { format, bitrate, sampleRate } = settings as unknown as Settings;
	const { codec, lossy } = CODEC[format];
	const name = `${basename(inputPath, extname(inputPath))}.${format}`;

	const args = ['-hide_banner', '-nostdin', '-loglevel', 'error', '-i', inputPath, '-vn'];
	args.push('-c:a', codec);
	if (lossy) args.push('-b:a', `${bitrate}k`);
	if (sampleRate !== 'same' && format !== 'ogg') args.push('-ar', sampleRate);
	args.push(join(outputDir, name));

	await new Promise<void>((resolve, reject) => {
		const ffmpeg = spawn('ffmpeg', args, { signal, stdio: ['ignore', 'ignore', 'pipe'] });
		let stderr = '';
		ffmpeg.stderr.on('data', (chunk) => (stderr += chunk));
		ffmpeg.on('error', reject);
		ffmpeg.on('close', (code) => {
			if (code === 0) return resolve();
			// The first line names the problem; later ones only say that opening the file failed.
			const reason = stderr.split('\n')[0].replace(/^\[[^\]]*\]\s*/, '') || `exit code ${code}`;
			reject(new Error(`ffmpeg could not convert this file: ${reason}`));
		});
	});
};

export default run;
