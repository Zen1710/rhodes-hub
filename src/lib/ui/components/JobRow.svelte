<script lang="ts">
	import { resolve } from '$app/paths';
	import { extensionOf, formatBytes } from '#lib/tools/input.ts';
	import { registry } from '#lib/tools/index.ts';
	import type { Tool } from '#lib/tools/types.ts';
	import { doneMeta, ordinal, resultNumeral, timeLeft } from '#lib/ui/format.ts';
	import { jobs, type Entry } from '#lib/ui/jobs.svelte.ts';

	let {
		entry,
		tool,
		selected = false,
		oncompare
	}: { entry: Entry; tool: Tool; selected?: boolean; oncompare: () => void } = $props();

	const job = $derived(entry.job);
	const progress = $derived(
		entry.state === 'uploading'
			? (entry.uploaded ?? 0) / (entry.inputSize || 1)
			: (job?.progress ?? 0)
	);
	const laneName = $derived(tool.lane === 'heavy' ? 'Heavy' : 'Light');

	/** Place among this browser's queued Jobs in the same Lane. */
	const place = $derived(
		jobs.entries
			.filter((e) => e.state === 'queued' && registry.get(e.toolId)?.lane === tool.lane)
			.findIndex((e) => e.key === entry.key) + 1
	);

	/** Output width for Tools whose result is a width; read from the image itself. */
	let width = $state<number>();
	$effect(() => {
		if (tool.result !== 'width' || entry.state !== 'done' || !job) return;
		const image = new Image();
		image.onload = () => (width = image.naturalWidth);
		image.src = `/api/jobs/${job.id}/download`;
	});

	const result = $derived({
		inputName: entry.filename,
		inputSize: entry.inputSize,
		outputs: job?.files ?? [],
		width
	});

	/** Compare needs the dropped file (gone after a reload) and formats the browser can show. */
	const canCompare = $derived(
		tool.category === 'image' &&
			entry.file !== undefined &&
			extensionOf(entry.filename) !== 'heic' &&
			job?.files?.length === 1
	);

	const button =
		'rounded border border-control-rule px-3 py-1.5 text-[17px] font-semibold transition-colors hover:border-text-3';
</script>

<li
	class={['flex items-center gap-6 border-b border-rule py-5', selected && '-mx-3 bg-surface px-3']}
>
	<div class="flex min-w-0 grow flex-col gap-1.5">
		<p class="truncate text-[19px] font-bold text-text">{entry.filename}</p>

		{#if entry.state === 'running' || entry.state === 'uploading'}
			{@const left = entry.runningSince && timeLeft(progress, Date.now() - entry.runningSince)}
			<div class="my-1 h-0.5 bg-rule" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
				<div
					class={[
						'h-full transition-[width]',
						entry.state === 'running' ? 'bg-accent' : 'bg-text-2'
					]}
					style:width="{progress * 100}%"
				></div>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				<p class="text-[17px] text-text-3">
					{#if entry.state === 'uploading'}
						Uploading · {formatBytes(entry.uploaded ?? 0)} of {formatBytes(entry.inputSize ?? 0)}
					{:else}
						Running{entry.inputSize ? ` · ${formatBytes(entry.inputSize)}` : ''}{left
							? ` · ${left}`
							: ''}
					{/if}
				</p>
				<button type="button" class="{button} text-text-2" onclick={() => jobs.cancel(entry.key)}>
					Cancel
				</button>
			</div>
		{:else if entry.state === 'waiting' || entry.state === 'queued'}
			<div class="flex flex-wrap items-center gap-3">
				<p class="text-[17px] text-text-3">
					{entry.state === 'waiting'
						? 'Waits until the uploads before it finish'
						: `Waiting in the ${laneName} lane${place > 0 ? ` · ${ordinal(place)} in line` : ''}`}
				</p>
				<button type="button" class="{button} text-text-2" onclick={() => jobs.cancel(entry.key)}>
					Cancel
				</button>
			</div>
		{:else if entry.state === 'done' && job}
			<p class="text-[17px] text-text-3">
				{doneMeta(result)}{job.note ? ` · ${job.note}` : ''}
			</p>
			<div class="flex gap-2 pt-1.5">
				<a
					href={resolve('/api/jobs/[id]/download', { id: job.id })}
					download
					class="{button} text-text">Download</a
				>
				{#if canCompare}
					<button type="button" class="{button} text-text" onclick={oncompare}>Compare</button>
				{/if}
			</div>
		{:else if entry.state === 'failed'}
			<p class="text-[17px] text-danger">{entry.reason ?? job?.error ?? 'Something went wrong.'}</p>
			<div class="flex gap-2 pt-1.5">
				<button type="button" class="{button} text-text" onclick={() => jobs.retry(entry.key)}>
					Retry
				</button>
			</div>
		{:else if entry.state === 'canceled'}
			<p class="text-[17px] text-text-3">Canceled. The partial file was deleted.</p>
		{:else if entry.state === 'not-added'}
			<p class="text-[17px] text-danger">{entry.reason} The other files continue.</p>
		{/if}
	</div>

	{#if entry.state === 'done'}
		{@const numeral = resultNumeral(tool.result, result)}
		<p
			class={[
				'shrink-0 leading-none font-extrabold',
				numeral === 'Done'
					? 'text-[36px] tracking-[-1px] text-text-2'
					: 'text-[68px] tracking-[-2.5px] text-text'
			]}
		>
			{numeral}
		</p>
	{:else if entry.state === 'running' || entry.state === 'uploading'}
		<p
			class={[
				'shrink-0 text-[36px] font-bold tracking-[-1px]',
				entry.state === 'running' ? 'text-accent' : 'text-text-2'
			]}
		>
			{Math.round(progress * 100)}%
		</p>
	{:else}
		<p
			class={[
				'shrink-0 text-[18px] font-bold',
				entry.state === 'failed' || entry.state === 'not-added' ? 'text-danger' : 'text-text-3'
			]}
		>
			{{ waiting: 'Queued', queued: 'Queued', failed: 'Failed', canceled: 'Canceled' }[
				entry.state as string
			] ?? 'Not added'}
		</p>
	{/if}
</li>
