import { getReadiness } from '#lib/server/jobs/index.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({ readiness: getReadiness() });
