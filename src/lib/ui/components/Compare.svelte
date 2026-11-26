<script lang="ts">
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import MoveHorizontalIcon from '@lucide/svelte/icons/move-horizontal';
	import { formatBytes } from '#lib/tools/input.ts';
	import type { Tool } from '#lib/tools/types.ts';
	import { resultNumeral } from '#lib/ui/format.ts';
	import type { Entry } from '#lib/ui/jobs.svelte.ts';

	let { entry, tool, onclose }: { entry: Entry; tool: Tool; onclose: () => void } = $props();

	let split = $state(50);
	let size = $state<{ width: number; height: number }>();

	const output = $derived(entry.job!.files![0]);
	const after = $derived(`/api/jobs/${entry.job!.id}/download`);
	const before = $derived(URL.createObjectURL(entry.file!));
	$effect(() => {
		const url = before;
		return () => URL.revokeObjectURL(url);
	});

	const afterLabel = 'Result';
	const numeral = $derived(
		resultNumeral(tool.result, {
			inputName: entry.filename,
			inputSize: entry.inputSize,
			outputs: [output],
			width: size?.width
		})
	);

	const image = 'absolute inset-0 size-full object-contain';
	const chip = 'absolute top-0 rounded bg-bg/85 px-2 py-0.5 text-[16px] font-bold text-text';
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && onclose()} />

<section
	class="field flex min-w-120 grow basis-0 flex-col gap-5 p-12 pt-6"
	aria-label="Compare {entry.filename}"
>
	<div class="flex items-center gap-3">
		<button
			type="button"
			onclick={onclose}
			class="text-text-2 transition-colors hover:text-text"
			aria-label="Back to dropping files"
		>
			<ArrowLeftIcon size={16} />
		</button>
		<h2 class="grow truncate text-[20px] font-bold text-text">{entry.filename}</h2>
		<span class="text-[17px] font-bold text-text">Fit</span>
	</div>

	<div class="relative min-h-80 grow">
		<img src={before} alt="Original" class={image} />
		<img
			src={after}
			alt={afterLabel}
			class={image}
			style:clip-path="inset(0 0 0 {split}%)"
			onload={(event) => {
				const img = event.currentTarget as HTMLImageElement;
				size = { width: img.naturalWidth, height: img.naturalHeight };
			}}
		/>
		<span class="{chip} left-3">Original</span>
		<span class={chip} style:left="calc({split}% + 12px)">{afterLabel}</span>
		<div
			class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white"
			style:left="{split}%"
		>
			<span
				class="absolute top-1/2 left-1/2 grid size-8 -translate-1/2 place-items-center rounded bg-white text-bg"
			>
				<MoveHorizontalIcon size={16} aria-hidden="true" />
			</span>
		</div>
		<input
			type="range"
			min="0"
			max="100"
			step="0.5"
			bind:value={split}
			aria-label="Divider between the original and the result"
			class="absolute inset-0 size-full cursor-ew-resize opacity-0"
		/>
	</div>

	<dl class="flex items-end gap-8 border-t border-field-rule pt-5">
		<div class="flex flex-col gap-1">
			<dt class="text-[17px] text-field-text">Original</dt>
			<dd class="text-[22px] font-bold text-white">{formatBytes(entry.inputSize ?? 0)}</dd>
		</div>
		<div class="flex flex-col gap-1">
			<dt class="text-[17px] text-field-text">{afterLabel}</dt>
			<dd class="text-[22px] font-bold text-white">{formatBytes(output.size)}</dd>
		</div>
		{#if size}
			<div class="flex flex-col gap-1">
				<dt class="text-[17px] text-field-text">Dimensions</dt>
				<dd class="text-[22px] font-bold text-white">{size.width} × {size.height}</dd>
			</div>
		{/if}
		<p class="ml-auto text-[52px] leading-none font-extrabold tracking-[-2px] text-white">
			{numeral}
		</p>
	</dl>
</section>
