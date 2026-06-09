<script lang="ts">
	import PaletteSwatch from './PaletteSwatch.svelte';
	import { effectsState } from '../state';
	import { pickTextFile, pickColor, type PaletteColor, type PalettePreset } from '../utils'
	import { getContext } from 'svelte';

	async function loadCustomPalette() {
		const text = await(pickTextFile());
		if (!text) return;
		const colors = parseCustomPalette(text);
		if (!colors) {
			alert("No valid colors found in file");
			return;
		}
		effectsState.update((e) => ({
			...e,
			palettization: {
				...e.palettization,
				palette: {
					colors: colors,
					presetName: null
				}
			}
		}));
	}

	function parseCustomPalette(text: string): PaletteColor[] {
		const colors: PaletteColor[] = [];
		const seen = new Set();
		const matches = text.match(/[0-9a-fA-F]{6}/g) || [];

		for (const hex of matches) {
			if (colors.length >=32) break;
			const color = "#" + hex.toLowerCase();
			if (seen.has(color)) continue;
			seen.add(color);
			colors.push({ color: color, enabled: true });
		}

		return colors;
	}

	async function addColor() {
		const color = await(pickColor());
		if (!color) return;
		const colors = $effectsState.palettization.palette.colors;
		colors.push({ color: color, enabled: true });
		effectsState.update((e) => ({
			...e,
			palettization: {
				...e.palettization,
				palette: {
					colors: colors,
					presetName: null
				}
			}
		}));
	}

	const palettePresets: PalettePreset[] = getContext('palette-presets');
	if (palettePresets.length > 0) {
		effectsState.update((e) => ({
	        ...e,
	        palettization: {
	            ...e.palettization,
	            palette: {
	                colors: palettePresets[0].colors.map((c) => ({color: c, enabled: true})),
	                presetName: palettePresets[0].name
	            }
	        }
	    }));
	}
	
	let selectedPresetName = $derived($effectsState.palettization.palette.presetName ?? "Custom");
	function changePreset() {
		const preset = palettePresets.find(p => p.name === selectedPresetName);
		if (!preset) return;

		effectsState.update((e) => ({
			...e,
			palettization: {
				...e.palettization,
				palette: {
					colors: preset.colors.map((c) => ({ color: c, enabled: true })),
					presetName: preset.name
				}
			}
		}));
	}
</script>

<div id=palette>
	<button onclick={loadCustomPalette}>Load Custom Palette from File</button>
	<select bind:value={selectedPresetName} onchange={changePreset}>
		{#each palettePresets as preset}
			<option value={preset.name}>{preset.name}</option>
		{/each}
		<option disabled>Custom</option>
	</select>
	<div id=swatches>
		{#each $effectsState.palettization.palette.colors as color, index}
			<PaletteSwatch {color} {index}/>
		{/each}
		<button id=add-color-btn onclick={addColor}>+</button>
	</div>
</div>

<style>
	#palette {
	    display: flex;
	    flex-direction: column;
	    gap: 10px;
	    margin-top: 10px;
	}

	#swatches {
	    display: grid;
	    grid-template-columns: repeat(4, 1fr);
	    gap: 6px;
	    max-height: 300px;
	    overflow-y: auto;
	}

	#add-color-btn {
		font-size: 20px;
		border: none;
		aspect-ratio: 1 / 1;
		background: var(--color-border);
	}

</style>