import { json } from '@sveltejs/kit';
import { ServiceError, type Download } from './jobs/service';

/** Runs an API handler and turns a ServiceError into a JSON error response. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
	try {
		return await fn();
	} catch (error) {
		if (error instanceof ServiceError) {
			return json({ error: error.message, details: error.details }, { status: error.status });
		}
		throw error;
	}
}

export function fileResponse(download: Download): Response {
	const headers = new Headers({
		'content-type': download.contentType,
		'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(download.filename)}`
	});
	if (download.size !== undefined) headers.set('content-length', String(download.size));
	return new Response(download.stream, { headers });
}
