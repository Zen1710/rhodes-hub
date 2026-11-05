import { json } from '@sveltejs/kit';
import { getJobService } from '#lib/server/jobs/index.ts';
import { handle } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ params }) =>
	handle(async () => json(getJobService().cancel(params.id)));
