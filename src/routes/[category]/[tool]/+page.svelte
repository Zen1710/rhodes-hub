<script lang="ts">
	import { resolve } from '$app/paths';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import TimerIcon from '@lucide/svelte/icons/timer';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import Compare from '#lib/ui/components/Compare.svelte';
	import JobRow from '#lib/ui/components/JobRow.svelte';
	import PageHeader from '#lib/ui/components/PageHeader.svelte';
	import SettingField from '#lib/ui/components/SettingField.svelte';
	import { dropHint, dropTitle } from '#lib/ui/format.ts';
	import { jobs, loadSettings, saveSettings } from '#lib/ui/jobs.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const tool = $derived(data.tool);
	const readiness = $derived(data.readiness[tool.id] ?? { ready: true as const });

	let settings = $state<Record<string, unknown>>({});
	let comparing = $state<string>();
	let dragging = $state(false);
	let copied = $state(false);
	let filesInput = $state<HTMLInputElement>();
	let folderInput = $state<HTMLInputElement>();

	$effect.pre(() => {
		settings = loadSettings(tool);
		comparing = undefined;
	});

	$effect(() => saveSettings(tool, $state.snapshot(settings)));

	const entries = $derived(jobs.forTool(tool.id));
	const done = $derived(entries.filter((e) => e.state === 'done' && e.job));
	const compared = $derived(entries.find((e) => e.key === comparing && e.state === 'done'));

	function add(files: FileList | File[] | null | undefined, fromFolder = false) {
		if (!files || files.length === 0) return;
		comparing = undefined;
		jobs.add(tool, [...files], $state.snapshot(settings), fromFolder);
	}

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:window
	onpaste={(event) => {
		if (readiness.ready && tool.category === 'image') add(event.clipboardData?.files);
	}}
/>

<PageHeader title={tool.name} description="{tool.description} Files stay on this Mac." />

<!-- On wide screens only the Job column scrolls, so the drop field and its settings stay in view. -->
<div class="flex grow flex-wrap xl:min-h-0 xl:flex-nowrap">
	{#if !readiness.ready}
		<section class="flex min-w-120 grow basis-0 flex-col gap-4 border-r border-rule p-12 pt-12">
			<p class="text-[17px] font-bold text-danger">Not ready</p>
			<h2 class="text-[36px] leading-[1.1] font-extrabold tracking-[-1px] text-text">
				{readiness.problem.replace(/\.$/, '')}
			</h2>
			<p class="max-w-102 text-[18px] leading-[1.5] text-text-2">
				{readiness.fix
					? 'Run this from the project folder, then restart Rhodes Hub. Other Tools keep working.'
					: 'This Tool arrives in a later build step. Other Tools keep working.'}
			</p>
			{#if readiness.fix}
				<div
					class="flex max-w-102 items-center justify-between rounded border border-rule bg-surface px-3.5 py-3"
				>
					<code class="font-sans text-[18px] font-semibold text-text">{readiness.fix}</code>
					<button
						type="button"
						onclick={() => copy(readiness.fix!)}
						class="flex items-center gap-1.5 text-[17px] font-semibold text-text-2 hover:text-text"
					>
						<CopyIcon size={14} aria-hidden="true" />
						{copied ? 'Copied' : 'Copy'}
					</button>
				</div>
			{/if}
		</section>
	{:else if compared}
		<Compare entry={compared} {tool} onclose={() => (comparing = undefined)} />
	{:else}
		<section
			class={[
				'field flex min-w-120 grow basis-0 flex-col justify-between gap-10 p-12 transition-shadow',
				dragging && 'shadow-[inset_0_0_0_2px_var(--color-accent)]'
			]}
			aria-label="Drop files"
			ondragover={(event) => {
				event.preventDefault();
				dragging = true;
			}}
			ondragleave={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node)) dragging = false;
			}}
			ondrop={(event) => {
				event.preventDefault();
				dragging = false;
				add(event.dataTransfer?.files);
			}}
		>
			<div class="flex flex-col gap-3.5">
				<h2 class="text-[48px] leading-[1.05] font-extrabold tracking-[-1.4px] text-white">
					{dropTitle(tool)}
				</h2>
				<p class="text-[19px] text-field-text">{dropHint(tool)}</p>
				<div class="flex gap-2.5 pt-3.5">
					<button
						type="button"
						onclick={() => filesInput?.click()}
						class="rounded bg-white px-4 py-2.5 text-[18px] font-bold text-field transition-opacity hover:opacity-90"
					>
						Choose files
					</button>
					{#if tool.lane === 'light'}
						<button
							type="button"
							onclick={() => folderInput?.click()}
							class="rounded border border-white px-4 py-2.5 text-[18px] font-bold text-white transition-colors hover:bg-white/10"
						>
							Choose folder
						</button>
					{/if}
				</div>
				<input
					bind:this={filesInput}
					type="file"
					multiple
					accept={tool.accepts.extensions.map((ext) => `.${ext}`).join(',')}
					class="hidden"
					onchange={(event) => {
						add(event.currentTarget.files);
						event.currentTarget.value = '';
					}}
				/>
				<input
					bind:this={folderInput}
					type="file"
					webkitdirectory
					class="hidden"
					onchange={(event) => {
						add(event.currentTarget.files, true);
						event.currentTarget.value = '';
					}}
				/>
			</div>

			<div class="flex gap-6 border-t border-field-rule pt-4.5">
				{#each Object.entries(tool.settings) as [key, field] (key)}
					<SettingField id="setting-{key}" {field} bind:value={settings[key]} />
				{/each}
			</div>
		</section>
	{/if}

	<section class="flex min-w-120 grow basis-0 flex-col px-12 xl:overflow-y-auto" aria-label="Jobs">
		{#if entries.length > 0}
			<div class="flex items-center justify-between border-b border-rule pt-6 pb-3.5">
				<p class="text-[17px] font-semibold text-text-3">
					Batch · {entries.length}
					{entries.length === 1 ? 'file' : 'files'} · {done.length} done
				</p>
				{#if done.length > 1}
					<a
						href="{resolve('/api/jobs/download')}?ids={done.map((e) => e.job!.id).join(',')}"
						download
						class="flex items-center gap-1.5 text-[17px] font-bold text-text hover:text-accent"
					>
						<DownloadIcon size={14} aria-hidden="true" />
						Download all
					</a>
				{/if}
			</div>
			<ul>
				{#each entries as entry (entry.key)}
					<JobRow
						{entry}
						{tool}
						selected={entry.key === comparing}
						oncompare={() => (comparing = entry.key)}
					/>
				{/each}
			</ul>
			<p class="mt-auto flex items-center gap-2 pt-10 pb-7 text-[17px] text-text-3">
				<TimerIcon size={14} aria-hidden="true" />
				Results are deleted after 24 hours or when the server restarts.
			</p>
		{:else}
			<div class="my-auto flex max-w-80 flex-col gap-2 py-12">
				<p class="text-[20px] font-bold text-text-2">No Jobs yet</p>
				<p class="text-[17px] leading-[1.45] text-text-3">
					Files you drop here will show up as Jobs, with their progress and downloads.
				</p>
			</div>
		{/if}
	</section>
</div>
