<script lang="ts">
	import { effectsState } from '../state';
	import { pickColor } from '../utils'

	let { color, index } = $props();

	async function pointerDown(e: PointerEvent) {
		e.preventDefault();
		const colors = $effectsState.palettization.palette.colors;
		let presetName = $effectsState.palettization.palette.presetName;;

		if (e.button === 0 && !e.shiftKey) {
			const newColor = await(pickColor(color.color));
			if (!newColor) return;
			colors[index].color = newColor;
			presetName = null;
		}

		if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
			colors[index] = { color: colors[index].color, enabled: !colors[index].enabled };
		}

		if (e.button === 2 ) {
			colors.splice(index, 1)
			presetName = null;
		}

		effectsState.update((e) => ({
			...e,
			palettization: {
				...e.palettization,
				palette: {
					colors: colors,
					presetName: presetName
				}
			}
		}));
	}
</script>

<div
	class="swatch"
	role="button"
	tabindex="0"
	class:disabled={!color.enabled}
	style:background-color={color.color}
	onpointerdown={(e) => pointerDown(e)}
	oncontextmenu={(e) => e.preventDefault()}
></div>

<style>
	.swatch {
        width: 100%;
        aspect-ratio: 1 / 1;
        border-radius: 4px;
        border: 4px solid transparent;
        box-sizing: border-box;
        cursor: pointer;

        &.disabled {
            border-color: red;
        }

        &:hover {
            border-color: var(--color-fg);
        }
    }
</style>