import { defineTool } from '#lib/tools/types.ts';

export default defineTool({
	name: 'Convert audio',
	description: 'Change format and bitrate.',
	keywords: ['convert', 'audio', 'mp3', 'wav', 'flac', 'm4a', 'ogg', 'bitrate'],
	lane: 'light',
	order: 2,
	result: 'saving',
	accepts: { extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'], noun: 'audio file' },
	maxBytes: 200 * 1024 * 1024,
	dependencies: ['ffmpeg', 'ffprobe'],
	settings: {
		format: {
			type: 'select',
			label: 'Format',
			options: [
				{ value: 'mp3', label: 'MP3' },
				{ value: 'm4a', label: 'M4A' },
				{ value: 'ogg', label: 'OGG' },
				{ value: 'flac', label: 'FLAC' },
				{ value: 'wav', label: 'WAV' }
			],
			default: 'mp3'
		},
		bitrate: {
			type: 'select',
			label: 'Bitrate',
			options: [
				{ value: '128', label: '128 kbps' },
				{ value: '192', label: '192 kbps' },
				{ value: '256', label: '256 kbps' },
				{ value: '320', label: '320 kbps' }
			],
			default: '320',
			hint: 'Ignored for FLAC and WAV.'
		},
		sampleRate: {
			type: 'select',
			label: 'Sample rate',
			options: [
				{ value: 'same', label: 'Same as input' },
				{ value: '44100', label: '44.1 kHz' },
				{ value: '48000', label: '48 kHz' }
			],
			default: 'same',
			hint: 'OGG is always 48 kHz.'
		}
	}
});
