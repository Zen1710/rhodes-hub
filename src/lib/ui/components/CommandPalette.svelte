<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Command, Dialog } from 'bits-ui';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CornerDownLeftIcon from '@lucide/svelte/icons/corner-down-left';
	import { registry } from '#lib/tools/index.ts';
	import { jobs } from '#lib/ui/jobs.svelte.ts';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let query = $state('');

	/** Name matches first, then keyword matches, which say which keyword hit. */
	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return registry.tools.map((tool) => ({ tool, keyword: undefined }));
		const byName = registry.tools.filter((tool) => tool.name.toLowerCase().includes(q));
		const byKeyword = registry.tools
			.filter((tool) => !byName.includes(tool))
			.map((tool) => ({ tool, keyword: tool.keywords.find((k) => k.toLowerCase().includes(q)) }))
			.filter((result) => result.keyword);
		return [...byName.map((tool) => ({ tool, keyword: undefined })), ...byKeyword];
	});

	function categoryName(id: string) {
		return registry.categories.find((c) => c.id === id)?.name;
	}

	function openTool(id: string) {
		const [category, tool] = id.split('/');
		open = false;
		goto(resolve('/[category]/[tool]', { category, tool }));
	}

	$effect(() => {
		if (!open) query = '';
	});
</script>

<svelte:window
	onkeydown={(event) => {
		if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			open = !open;
		}
	}}
/>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-40 bg-bg/70" />
		<Dialog.Content
			class="fixed top-[16vh] left-1/2 z-50 w-[min(534px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded border border-control-rule bg-surface shadow-[0_24px_64px_rgb(0_0_0/0.5)]"
		>
			<Dialog.Title class="sr-only">Search tools</Dialog.Title>
			<Command.Root shouldFilter={false} loop>
				<div class="flex items-center gap-3 border-b border-control-rule px-4.5 py-4">
					<SearchIcon size={18} class="text-text-2" aria-hidden="true" />
					<Command.Input
						bind:value={query}
						placeholder="Search tools"
						class="grow bg-transparent text-[22px] font-semibold text-text outline-none placeholder:text-text-3"
					/>
					<kbd class="font-sans text-[16px] text-text-2">esc</kbd>
				</div>
				<Command.List class="py-1.5">
					<Command.Viewport>
						<Command.Empty class="px-4.5 py-4 text-[18px] text-text-2">
							No Tool matches “{query}”.
						</Command.Empty>
						{#each results as { tool, keyword } (tool.id)}
							{@const running = jobs.active(tool.id).filter((e) => e.state === 'running').length}
							<Command.Item
								value={tool.id}
								onSelect={() => openTool(tool.id)}
								class="group flex cursor-pointer items-center gap-4 px-4.5 py-3 data-selected:bg-select"
							>
								<div class="flex grow flex-col gap-0.5">
									<span class="text-[19px] font-bold text-text">{tool.name}</span>
									<span class="text-[17px] text-text-2">
										{keyword ? `Matches keyword: ${keyword}` : tool.description}
									</span>
								</div>
								{#if running > 0}
									<span class="text-[16px] font-bold text-accent">{running} running</span>
								{/if}
								<span class="text-[17px] text-text-2">{categoryName(tool.category)}</span>
								<CornerDownLeftIcon
									size={14}
									class="text-text-2 opacity-0 group-data-selected:opacity-100"
									aria-hidden="true"
								/>
							</Command.Item>
						{/each}
					</Command.Viewport>
				</Command.List>
				<div class="flex gap-4.5 border-t border-control-rule px-4.5 py-3 text-[16px] text-text-2">
					<span>↑↓ to move</span>
					<span>Enter to open</span>
					<span>Searches names and keywords</span>
				</div>
			</Command.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
