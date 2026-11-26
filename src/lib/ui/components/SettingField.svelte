<script lang="ts">
	import { Select } from 'bits-ui';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import type { SettingField } from '#lib/tools/types.ts';

	let {
		id,
		field,
		value = $bindable()
	}: { id: string; field: SettingField; value: unknown } = $props();

	const control =
		'flex w-full items-center justify-between gap-2 border-b border-white/40 pb-2 text-[22px] font-bold text-white';
</script>

<div class="flex min-w-0 grow basis-0 flex-col gap-1.5">
	<label for={id} class="text-[17px] font-semibold text-field-text">{field.label}</label>

	{#if field.type === 'select'}
		<Select.Root
			type="single"
			value={String(value)}
			onValueChange={(next) => (value = next)}
			items={field.options}
		>
			<Select.Trigger {id} class="{control} text-left">
				<span class="truncate">{field.options.find((o) => o.value === value)?.label}</span>
				<ChevronDownIcon size={16} aria-hidden="true" />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content
					sideOffset={6}
					class="z-50 min-w-(--bits-select-anchor-width) rounded border border-control-rule bg-surface py-1 shadow-[0_16px_40px_rgb(0_0_0/0.45)]"
				>
					<Select.Viewport>
						{#each field.options as option (option.value)}
							<Select.Item
								value={option.value}
								label={option.label}
								class="flex cursor-pointer items-center justify-between gap-4 px-3 py-1.5 text-[19px] font-semibold text-text-2 data-highlighted:bg-select data-highlighted:text-text data-selected:text-text"
							>
								{#snippet children({ selected })}
									{option.label}
									{#if selected}<CheckIcon size={14} aria-hidden="true" />{/if}
								{/snippet}
							</Select.Item>
						{/each}
					</Select.Viewport>
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	{:else if field.type === 'number'}
		<div class={control}>
			<input
				{id}
				type="number"
				min={field.min}
				max={field.max}
				step={field.step ?? 1}
				value={value as number}
				oninput={(event) => {
					const n = event.currentTarget.valueAsNumber;
					if (Number.isFinite(n)) value = Math.min(field.max, Math.max(field.min, n));
				}}
				class="w-full min-w-0 [appearance:textfield] bg-transparent outline-none [&::-webkit-inner-spin-button]:appearance-none"
			/>
			{#if field.unit}<span class="text-[19px] text-field-text">{field.unit}</span>{/if}
		</div>
	{/if}

	{#if field.hint}<p class="text-[17px] leading-[1.3] text-field-text/80">{field.hint}</p>{/if}
</div>
