<script lang="ts">
	import SectionHeader from './SectionHeader.svelte'
	import EffectHeader from './EffectHeader.svelte'
	import Palette from './Palette.svelte'
	import Slider from './Slider.svelte'
	import { effectsState } from '../state'
</script>

<section id="effects">
	<SectionHeader title="Effects" bind:enabled={$effectsState.enabled}/>
	<div id="effects-list" class={$effectsState.enabled ? '' : 'inactive'}>
		<div class="effect">
			<EffectHeader name="SmartBlur" bind:enabled={$effectsState.smartBlur.enabled}/>
			<div class="controls {$effectsState.smartBlur.enabled ? '' : 'hidden'}">
				<Slider bind:value={$effectsState.smartBlur.strength} label="Strength" max={0.25} power={2}/>
			</div>
		</div>
		<div class="effect">
			<EffectHeader name="Color Adjustments" bind:enabled={$effectsState.colorAdjustments.enabled}/>
			<div class="controls {$effectsState.colorAdjustments.enabled ? '' : 'hidden'}">
				<Slider bind:value={$effectsState.colorAdjustments.brightness} label="Brightness" min={-1} max={1} power={2}/>
				<Slider bind:value={$effectsState.colorAdjustments.saturation} label="Saturation" min={-1} max={1} power={2}/>
				<Slider bind:value={$effectsState.colorAdjustments.shadows}    label="Shadows"    min={-1} max={1} power={2}/>
				<Slider bind:value={$effectsState.colorAdjustments.highlights} label="Highlights" min={-1} max={1} power={2}/>
				<Slider bind:value={$effectsState.colorAdjustments.hue}        label="Hue"        min={-180} max={180} power={1}/>
			</div>
		</div>
		<div class="effect">
			<EffectHeader name="Palettization" bind:enabled={$effectsState.palettization.enabled}/>
			<div class="controls {$effectsState.palettization.enabled ? '' : 'hidden'}">
				<Slider bind:value={$effectsState.palettization.colorMix} label="Color Mix" min={0} max={0.5} power={2}/>
				<Palette/>
			</div>
		</div>
		<div class="effect">
			<EffectHeader name="Luma Grain" bind:enabled={$effectsState.lumaGrain.enabled}/>
			<div class="controls {$effectsState.lumaGrain.enabled ? '' : 'hidden'}">
				<Slider bind:value={$effectsState.lumaGrain.strength} label="Strength" max={15} power={1}/>
			</div>
		</div>
	</div>
</section>

<style>
	#effects {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	#effects-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: all 0.2s ease;

		&.inactive {
			opacity: 0.4;
			pointer-events: none;
		}
	}

	.effect {
		padding: 8px;
		display: flex;
		flex-direction: column;
		border: 1px solid var(--color-border);
	}

	.controls {
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
	}


</style>