<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import favicon from '#lib/assets/favicon.svg';
	import Sidebar from '#lib/ui/components/Sidebar.svelte';
	import CommandPalette from '#lib/ui/components/CommandPalette.svelte';
	import { jobs } from '#lib/ui/jobs.svelte.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	let searching = $state(false);

	onMount(() => jobs.start());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-dvh overflow-hidden">
	<Sidebar readiness={data.readiness} onsearch={() => (searching = true)} />
	<main class="flex min-w-0 grow flex-col overflow-y-auto">
		{@render children()}
	</main>
</div>

<CommandPalette bind:open={searching} />
