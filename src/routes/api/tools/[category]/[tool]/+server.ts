import { json } from '@sveltejs/kit';
import { getJobService, ServiceError } from '#lib/server/jobs/index.ts';
import { handle } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

/** Starts one Job: the request body is the file, `?filename=` names it, other params are settings. */
export const POST: RequestHandler = ({ params, url, request }) =>
	handle(async () => {
		if (!request.body) throw new ServiceError(400, 'Missing file in the request body.');
		const length = request.headers.get('content-length');
		const job = await getJobService().start(`${params.category}/${params.tool}`, {
			filename: url.searchParams.get('filename') ?? '',
			query: Object.fromEntries(url.searchParams),
			body: request.body,
			size: length ? Number(length) : undefined
		});
		return json(job, { status: 202 });
	});
