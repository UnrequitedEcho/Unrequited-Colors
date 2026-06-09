<script lang="ts">
	import SectionHeader from './SectionHeader.svelte'
	import RadioRow from './RadioRow.svelte'
	import Slider from './Slider.svelte'
	import { cropState, previewState, sourceImage } from '../state'
	import { clampToImageBounds } from '../utils'
    import { untrack } from 'svelte';

	const aspectRatioOptions = ['Original', '16:9', '4:3', '21:9', 'Custom'];

	let cropEnabled = $state(false);
	let rotation = $state(0);
	let aspectRatioChoice = $state(aspectRatioOptions[0]);
	let customARW = $state(16);
	let customARH = $state(9);

	const aspectRatio = $derived.by(() => {
		let newAspectRatio = 16 / 9;
		$inspect(aspectRatioChoice);
		switch	(aspectRatioChoice) {
		case 'Original':
			if ($sourceImage) {
				newAspectRatio = $sourceImage.bitmap.width / $sourceImage.bitmap.height;
			}
			break;
		case 'Custom':
			if (customARW / customARH > 0) newAspectRatio = customARW / customARH;
			break;
		default:
			const n = aspectRatioChoice.split(":").map(Number);
			newAspectRatio = n[0] / n[1];
		}
		return newAspectRatio;
	});

	let desiredScale = $state(100);

	$effect(() => {
	    if (!$sourceImage) return;

	    const [centerX, centerY, scale] = clampToImageBounds(
	        untrack(() => $sourceImage.bitmap.width),
	        untrack(() => $sourceImage.bitmap.height),
	        untrack(() => $cropState.centerX),
	        untrack(() => $cropState.centerY),
	        desiredScale * $sourceImage.bitmap.height / 100,
	        -rotation,
	        aspectRatio
	    );

	    cropState.update(c => ({
	        ...c,
	        rotation: -rotation,
	        aspectRatio,
	        centerX,
	        centerY,
	        scale
	    }));
	});

	$effect(() => {
		cropState.update((c) => ({
			...c, enabled: cropEnabled
		}));
		if (!cropEnabled && $previewState.mode === 'cropEdit') {
			previewState.update((p) => ({
				...p, mode: $previewState.mode === 'preview' ? 'cropEdit' : 'preview'
			}));
		}
	})

	function toggleEdit() {
		previewState.update((p) => ({
			...p, mode: $previewState.mode === 'preview' ? 'cropEdit' : 'preview'
		}));
	}

	function onKeyDown(e: KeyboardEvent) {
		if ($previewState.mode === 'cropEdit' && e.key === 'Escape') {
			toggleEdit();
		}
	}

</script>

<section id="effects">
	<SectionHeader title="Crop" bind:enabled={cropEnabled}/>
	<div id="crop-controls" class="{$cropState.enabled ? '' : 'hidden'} {$sourceImage ? '' : 'disabled'}">
		<button onclick={toggleEdit} class={$previewState.mode === 'cropEdit' ? 'active' : ''}>Edit Crop</button>
		<RadioRow options={aspectRatioOptions} bind:value={aspectRatioChoice}/>
		<div id="custom-aspect-ratio-row" class="{aspectRatioChoice === 'Custom' ? '' : 'hidden'}">
			<input type=number min=1 bind:value={customARW}/>
			<span>:</span>
			<input type=number min=1 bind:value={customARH}/>
		</div>
		<Slider bind:value={rotation} label="Rotation" min={-90} max={90} power={2}/>
		<Slider bind:value={desiredScale} label="Size" min = {1} max={100} power={1}/>
	</div>
</section>
<svelte:window on:keydown={onKeyDown}/>

<style>
	#crop-controls {
		padding: 8px;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
	}

	#crop-controls {
		display: flex;
		flex-direction: column;
		gap: 6px;
		max-height: 500px;
		overflow: hidden;
		opacity: 1;
		transition: all 0.2s ease;
		margin-top: 8px;

		&.hidden {
			max-height: 0;
			opacity: 0;
			margin-top: 0px;
		}

		&.disabled:not(.hidden) {
			opacity: 0.4;
			pointer-events: none;
		}
	}

	#custom-aspect-ratio-row {
		display: flex;
		gap: 10px;
		align-items: center;
		max-height: 500px;
		overflow: hidden;
		opacity: 1;
		transition: all 0.2s ease;

		&.hidden {
			max-height: 0;
			opacity: 0;
			margin-top: 0px;
		}
	}

	input {
		width: 100%;
		border: 1px solid var(--color-border);
		outline: none;
		padding: 4px 8px;

		&::-webkit-outer-spin-button,
        &::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        &[type=number] {
            appearance: textfield;
        }

        &:first-child {
        	text-align: right;
        }
	}
</style>