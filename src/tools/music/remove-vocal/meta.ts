import { defineTool } from '#lib/tools/types.ts';

export default defineTool({
	name: 'Remove vocal',
	description: 'Split a song into Vocals and Instrumental.',
	keywords: ['remove vocal', 'karaoke', 'instrumental', 'acapella', 'stems', 'separate'],
	lane: 'heavy',
	order: 1,
	accepts: { extensions: ['mp3', 'wav', 'flac', 'm4a'], noun: 'audio file' },
	maxBytes: 200 * 1024 * 1024,
	maxDurationSec: 15 * 60,
	dependencies: ['ffmpeg', 'ffprobe', 'vocal-separator'],
	settings: {
		format: {
			type: 'select',
			label: 'Output format',
			options: [
				{ value: 'mp3', label: 'MP3 320 kbps' },
				{ value: 'wav', label: 'WAV' }
			],
			default: 'mp3'
		}
	}
});
