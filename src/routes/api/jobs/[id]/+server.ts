import { json } from '@sveltejs/kit';
import { getJobService, ServiceError } from '#lib/server/jobs/index.ts';
import { handle } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ params }) =>
	handle(async () => {
		const job = getJobService().get(params.id);
		if (!job) throw new ServiceError(404, `No Job with id ${params.id}.`);
		return json(job);
	});
