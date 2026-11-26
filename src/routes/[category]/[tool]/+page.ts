import { error } from '@sveltejs/kit';
import { registry } from '#lib/tools/index.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const tool = registry.get(`${params.category}/${params.tool}`);
	if (!tool) error(404, 'There is no such Tool.');
	return { tool };
};
