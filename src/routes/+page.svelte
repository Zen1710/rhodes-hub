<script lang="ts">
	import { resolve } from '$app/paths';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import { registry } from '#lib/tools/index.ts';
	import type { Lane } from '#lib/tools/types.ts';
	import PageHeader from '#lib/ui/components/PageHeader.svelte';
	import { formatNames, timeLeft } from '#lib/ui/format.ts';
	import { jobs } from '#lib/ui/jobs.svelte.ts';

	const LANES: { id: Lane; name: string; slots: number }[] = [
		{ id: 'heavy', name: 'Heavy lane', slots: 1 },
		{ id: 'light', name: 'Light lane', slots: 2 }
	];

	const toolCount = registry.tools.length;
	const categoryCount = registry.categories.length;

	function inLane(lane: Lane, state: 'running' | 'queued') {
		return jobs.entries.filter((e) => e.state === state && registry.get(e.toolId)?.lane === lane);
	}
</script>

<PageHeader
	title="Tools"
	description="{toolCount} tools in {categoryCount} categories. Every file is processed on this Mac."
/>

<div class="flex grow flex-wrap">
	<div class="min-w-120 grow basis-0 px-12">
		{#each registry.categories as category (category.id)}
			<section class="flex gap-6 border-b border-rule py-5">
				<div class="flex w-50 shrink-0 flex-col gap-1.5">
					<h2 class="text-[36px] font-extrabold tracking-[-1px] text-text">{category.name}</h2>
					<p class="text-[17px] text-text-3">{category.note}</p>
				</div>
				<ul class="grid grow grid-cols-2 gap-x-6">
					{#each category.tools as tool, i (tool.id)}
						<li class={[i >= 2 && 'border-t border-rule']}>
							<a
								href={resolve('/[category]/[tool]', { category: tool.category, tool: tool.slug })}
								class="group flex flex-col gap-1.5 py-3.5"
							>
								<span class="flex items-center justify-between">
									<span class="text-[22px] font-bold text-text group-hover:text-accent">
										{tool.name}
									</span>
									<ArrowUpRightIcon
										size={14}
										class="text-text-3 group-hover:text-accent"
										aria-hidden="true"
									/>
								</span>
								<span class="text-[18px] leading-[1.4] text-text-2">{tool.description}</span>
								<span class="text-[16px] font-semibold tracking-[0.6px] text-text-3">
									{formatNames(tool).join(' ')}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>

	<aside class="field flex w-100 shrink-0 flex-col gap-7 p-10" aria-labelledby="running-now">
		<h2 id="running-now" class="text-[30px] font-extrabold tracking-[-0.8px] text-white">
			Running now
		</h2>
		{#each LANES as lane (lane.id)}
			{@const running = inLane(lane.id, 'running')}
			{@const queued = inLane(lane.id, 'queued').length}
			<section class="flex flex-col gap-3 border-t border-field-rule pt-4">
				<div class="flex justify-between text-[17px]">
					<h3 class="font-bold text-white">{lane.name}</h3>
					<span class="text-field-text">
						{running.length} of {lane.slots}
						{lane.slots === 1 ? 'slot' : 'slots'}
					</span>
				</div>
				{#each running as entry (entry.key)}
					{@const progress = entry.job?.progress ?? 0}
					{@const left = entry.runningSince && timeLeft(progress, Date.now() - entry.runningSince)}
					<a
						href={resolve('/[category]/[tool]', {
							category: entry.toolId.split('/')[0],
							tool: entry.toolId.split('/')[1]
						})}
						class="flex items-end justify-between gap-4"
					>
						<span class="flex min-w-0 flex-col gap-1">
							<span class="truncate text-[20px] font-bold text-white">{entry.filename}</span>
							<span class="text-[17px] text-field-text">
								{registry.get(entry.toolId)?.name}{left ? ` · ${left}` : ''}
							</span>
						</span>
						<span class="text-[44px] leading-none font-extrabold tracking-[-1.5px] text-white">
							{Math.round(progress * 100)}%
						</span>
					</a>
				{:else}
					<p class="text-[17px] text-field-text">Nothing running.</p>
				{/each}
				{#if queued > 0}
					<p class="text-[17px] text-field-text">{queued} more queued</p>
				{/if}
			</section>
		{/each}
		<p class="mt-auto text-[17px] leading-[1.45] text-field-text">
			Shows Jobs started from this browser. Closing the tab does not stop a Job; open its Tool page
			to download.
		</p>
	</aside>
</div>
