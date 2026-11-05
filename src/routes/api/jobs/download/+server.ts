import { getJobService, ServiceError } from '#lib/server/jobs/index.ts';
import { fileResponse, handle } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

/** One zip with the results of every finished Job in `?ids=<id1>,<id2>`. */
export const GET: RequestHandler = ({ url }) =>
	handle(async () => {
		const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
		if (ids.length === 0) throw new ServiceError(400, 'Pass the Job ids as ?ids=<id1>,<id2>.');
		return fileResponse(await getJobService().downloadBatch(ids));
	});
