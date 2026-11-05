import type { ServerInit } from '@sveltejs/kit/hooks';
import { startJobs } from './lib/server/jobs';

export const init: ServerInit = async () => {
	await startJobs();
};
