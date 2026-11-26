<script lang="ts">
	import { jobs } from '#lib/ui/jobs.svelte.ts';

	let { title, description }: { title: string; description: string } = $props();

	const running = $derived(jobs.entries.filter((e) => e.state === 'running').length);
</script>

<svelte:head>
	<title>{running > 0 ? `(${running}) ` : ''}{title} · Rhodes Hub</title>
</svelte:head>

<header
	class="flex flex-wrap items-end justify-between gap-x-12 gap-y-3 border-b border-rule px-12 pt-9 pb-7"
>
	<h1 class="text-[60px] leading-none font-extrabold tracking-[-2px] text-text">{title}</h1>
	<p class="max-w-90 text-[19px] leading-[1.45] text-text-2">{description}</p>
</header>
