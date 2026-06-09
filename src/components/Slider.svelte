<script lang="ts">
	let { 
		label, 
		min = 0, 
		max = 100, 
		step = "any", 
		power = 1, 
		value = $bindable(),
	} = $props();

    const defaultValue = value;
    const sliderToValue = (x: number) => Math.pow(Math.abs(x), power) * Math.sign(x);
    const valueToSlider = (x: number) => Math.pow(Math.abs(x), (1 / power)) * Math.sign(x);

    let prettyValue = $derived.by(() => {
    	if (value === 0) return 0;
        if (Math.abs(value) >= 10) return value.toFixed(0);
        if (Math.abs(value) >= 1) return value.toFixed(1);
        if (Math.abs(value) >= 0.1) return value.toFixed(2);
        return value.toFixed(3);
    })

    let sliderValue = $derived(valueToSlider(value));
</script>

<div class="slider-group">
	<div>
		<span>{label}</span>
		<span class="numeric-display">{prettyValue}</span>
	</div>
	<div>
		<input 
			type="range" 
			bind:value={sliderValue}
			min={valueToSlider(min)}
			max={valueToSlider(max)} 
			step={step}
			oninput={(e) =>
				value = sliderToValue(
					Number(e.currentTarget.value)
				)
			}
			onwheel={(e) => {
				e.preventDefault();
				const direction = e.deltaY < 0 ? 1 : -1;
				let sliderVal = Number(e.currentTarget.value);
				sliderVal = typeof(step) === "string"
					?  sliderVal + direction * (valueToSlider(max) - valueToSlider(min)) / 100
					: sliderVal + direction * valueToSlider(step);
				sliderVal = Math.max(min, Math.min(max, sliderVal));
				value = sliderToValue(sliderVal);
			}}
		/>
		<button onclick={() => value = defaultValue}>⟲</button>
	</div>
</div>

<style>
	.slider-group {
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 2px;

		div {
			width: 100%;
			display: flex;
			justify-content: space-between;
			gap: 10px;
		}
	}

	span {
		min-width: 12px;
		padding: 0px 4px;
		display: flex;
		justify-content: flex-end;
	}

	button {
		width: 22px;
		aspect-ratio: 1/1;
		padding: 0px;
		flex-shrink: 0;
		font-size: 12px;
	}

	input {
		width: 100%;

	    &::-moz-range-track {
		    height: 4px;
		    background: var(--color-border);
		    border-radius: 4px;
		}

		&::-webkit-slider-runnable-track {
		    height: 4px;
		    background: var(--color-border);
		    border-radius: 4px;
		}

	    &::-moz-range-thumb {
		    width: 14px;
		    height: 14px;
		    border-radius: 50%;
		    background: var(--color-fg);
		    cursor: pointer;
		    border: none;
		}

		&::-webkit-slider-thumb {
		    -webkit-appearance: none;
		    width: 14px;
		    height: 14px;
		    border-radius: 50%;
		    background: var(--color-fg);
		    cursor: pointer;

		    margin-top: -5px;
		}
	}
</style>
