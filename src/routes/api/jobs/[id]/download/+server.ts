import { getJobService } from '#lib/server/jobs/index.ts';
import { fileResponse, handle } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

/** One output as itself, several as a zip, or `?file=<name>` for one of them. */
export const GET: RequestHandler = ({ params, url }) =>
	handle(async () =>
		fileResponse(
			await getJobService().download(params.id, url.searchParams.get('file') ?? undefined)
		)
	);
