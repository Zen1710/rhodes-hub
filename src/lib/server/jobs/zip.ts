import { createReadStream } from 'node:fs';
import { Zip, ZipPassThrough } from 'fflate';

export interface ZipEntry {
	/** Name inside the zip. */
	name: string;
	/** File on disk. */
	path: string;
}

/**
 * Streams a zip of `entries` without holding the files in memory.
 * Entries are stored, not deflated: images and audio are already compressed.
 */
export function zipFiles(entries: ZipEntry[]): ReadableStream<Uint8Array> {
	return new ReadableStream<Uint8Array>({
		async start(controller) {
			const zip = new Zip((error, chunk, final) => {
				if (error) return controller.error(error);
				controller.enqueue(chunk);
				if (final) controller.close();
			});
			try {
				for (const entry of entries) {
					const file = new ZipPassThrough(entry.name);
					zip.add(file);
					for await (const chunk of createReadStream(entry.path)) {
						file.push(chunk as Uint8Array);
					}
					file.push(new Uint8Array(0), true);
				}
				zip.end();
			} catch (error) {
				controller.error(error);
			}
		}
	});
}
