<script lang="ts">
	import SectionHeader from './SectionHeader.svelte'
	import RadioRow from './RadioRow.svelte'
	import Slider from './Slider.svelte'
	import { cropState, previewState, sourceImage, updateCrop } from '../state'
    import { untrack } from 'svelte';
    import { computeMaxCropHeight } from '../utils';

	const aspectRatioOptions = ['Original', '16:9', '4:3', '21:9', 'Custom'];

	let cropEnabled = $state(false);
	let aspectRatioChoice = $state(aspectRatioOptions[0]);
	let customARW = $state(16);
	let customARH = $state(9);
	let sliderCropHeight = $derived.by(() => {
		if (!$sourceImage) return 100;
		return $cropState.height / $sourceImage.bitmap.height * 100;
	});
	let sliderMaxCropHeight = $derived.by(() => {
		if (!$sourceImage) return 100;
		const maxHeight = computeMaxCropHeight(
			$sourceImage.bitmap.width, $sourceImage.bitmap.height,
			$cropState.rotation, $cropState.aspectRatio
		);
		return maxHeight / $sourceImage.bitmap.height * 100;
	});
	let sliderRotation = $derived(-1 * $cropState.rotation);

	const aspectRatio = $derived.by(() => {
		let newAspectRatio = 16 / 9;
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

	$effect(() => {
		updateCrop({aspectRatio});
	})

	function onHeightChange(value: number) {
		if (!$sourceImage) return;
	    updateCrop({
	        height: value * $sourceImage.bitmap.height / 100
	    });
	}

	function onRotationChange(value: number) {
		if (!$sourceImage) return;
	    updateCrop({
	        rotation: -1 * value
	    });
	}

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
		<button onclick={toggleEdit} class={$previewState.mode === 'cropEdit' ? 'active' : ''}>Adjust Crop</button>
		<RadioRow options={aspectRatioOptions} bind:value={aspectRatioChoice}/>
		<div id="custom-aspect-ratio-row" class="{aspectRatioChoice === 'Custom' ? '' : 'hidden'}">
			<input type=number min=1 bind:value={customARW}/>
			<span>:</span>
			<input type=number min=1 bind:value={customARH}/>
		</div>
		<Slider bind:value={sliderRotation} label="Rotation" onInput={onRotationChange} min={-90} max={90} power={2}/>
		<Slider bind:value={sliderCropHeight} bind:max={sliderMaxCropHeight} label="Size" onInput={onHeightChange} min = {1} power={1}/>
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