<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { registry } from '#lib/tools/index.ts';
	import type { Readiness } from '#lib/server/dependencies.ts';
	import { jobs } from '#lib/ui/jobs.svelte.ts';

	let { readiness, onsearch }: { readiness: Record<string, Readiness>; onsearch: () => void } =
		$props();

	const notReady = $derived(registry.tools.filter((tool) => readiness[tool.id]?.ready === false));
</script>

<nav
	class="flex h-dvh w-62 shrink-0 flex-col gap-8 border-r border-rule px-6 py-7"
	aria-label="Tools"
>
	<a href={resolve('/')} class="text-[22px] font-extrabold tracking-[-0.4px] text-text"
		>Rhodes Hub</a
	>

	<button
		type="button"
		onclick={onsearch}
		class="flex items-center gap-2 border border-rule px-3 py-2.5 text-left text-[18px] text-text-3 transition-colors hover:border-control-rule hover:text-text-2"
	>
		<SearchIcon size={14} aria-hidden="true" />
		<span class="grow">Search tools</span>
		<kbd class="font-sans text-[17px] font-semibold">⌘K</kbd>
	</button>

	{#each registry.categories as category (category.id)}
		<div class="flex flex-col gap-0.5">
			<h2 class="mb-2 text-[16px] font-bold tracking-[1px] text-text-3 uppercase">
				{category.name}
			</h2>
			{#each category.tools as tool (tool.id)}
				{@const current = page.url.pathname === `/${tool.id}`}
				{@const running = jobs.active(tool.id).filter((e) => e.state === 'running').length}
				<a
					href={resolve('/[category]/[tool]', { category: tool.category, tool: tool.slug })}
					aria-current={current ? 'page' : undefined}
					class={[
						'flex items-center justify-between py-1.75 text-[19px] transition-colors',
						current ? 'font-bold text-text' : 'text-text-2 hover:text-text'
					]}
				>
					{tool.name}
					{#if readiness[tool.id]?.ready === false}
						<span class="text-[16px] font-bold text-danger">Not ready</span>
					{:else if running > 0}
						<span class="text-[16px] font-bold text-accent">{running} running</span>
					{/if}
				</a>
			{/each}
		</div>
	{/each}

	<footer class="mt-auto flex flex-col gap-1 border-t border-rule pt-4">
		{#if notReady.length > 0}
			<p class="text-[17px] font-semibold text-danger">
				{notReady.length}
				{notReady.length === 1 ? 'tool' : 'tools'} not ready
			</p>
		{:else}
			<p class="text-[17px] font-semibold text-text-2">All tools ready</p>
		{/if}
		<p class="text-[16px] leading-[1.2] text-text-3">{page.url.host} · files stay on this Mac</p>
	</footer>
</nav>
