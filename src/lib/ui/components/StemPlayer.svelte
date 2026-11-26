<script lang="ts" module>
	/** Only one stem plays at a time across the page. */
	let playing: HTMLAudioElement | undefined;
</script>

<script lang="ts">
	import { resolve } from '$app/paths';
	import PlayIcon from '@lucide/svelte/icons/play';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import DownloadIcon from '@lucide/svelte/icons/download';

	let { jobId, file }: { jobId: string; file: string } = $props();

	let audio = $state<HTMLAudioElement>();
	let paused = $state(true);
	let currentTime = $state(0);
	let duration = $state(0);

	const src = $derived(
		`${resolve('/api/jobs/[id]/download', { id: jobId })}?file=${encodeURIComponent(file)}`
	);
	/** "song (Vocals).mp3" → "Vocals" */
	const label = $derived(/\(([^)]+)\)\.[^.]+$/.exec(file)?.[1] ?? file);

	function time(sec: number) {
		const s = Math.floor(sec);
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	}

	function toggle() {
		if (!audio) return;
		if (audio.paused) {
			if (playing && playing !== audio) playing.pause();
			playing = audio;
			audio.play();
		} else {
			audio.pause();
		}
	}
</script>

<div class="flex items-center gap-4 py-2">
	<button
		type="button"
		onclick={toggle}
		aria-label="{paused ? 'Play' : 'Pause'} {label}"
		class="grid size-8 shrink-0 place-items-center rounded border border-control-rule text-text transition-colors hover:border-text-3"
	>
		{#if paused}<PlayIcon size={14} />{:else}<PauseIcon size={14} />{/if}
	</button>
	<span class="w-28 shrink-0 text-[18px] font-bold text-text">{label}</span>
	<input
		type="range"
		min="0"
		max={duration || 0}
		step="0.1"
		value={currentTime}
		oninput={(event) => audio && (audio.currentTime = event.currentTarget.valueAsNumber)}
		aria-label="Position in {label}"
		class="h-0.5 min-w-0 grow cursor-pointer appearance-none bg-rule accent-text"
		style:background="linear-gradient(to right, var(--color-text) {duration
			? (currentTime / duration) * 100
			: 0}%, var(--color-rule) 0)"
	/>
	<span class="shrink-0 text-[17px] text-text-3">{time(currentTime)} / {time(duration)}</span>
	<a
		href="{resolve('/api/jobs/[id]/download', { id: jobId })}?file={encodeURIComponent(file)}"
		download
		aria-label="Download {label}"
		class="shrink-0 text-text-2 hover:text-text"
	>
		<DownloadIcon size={16} />
	</a>
	<audio bind:this={audio} bind:paused bind:currentTime bind:duration {src} preload="metadata"
	></audio>
</div>
