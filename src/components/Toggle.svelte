<script lang="ts">
	let { value = $bindable() } = $props();
</script>

<label class="toggle">
	<input type="checkbox" bind:checked={value}>
	<span></span>
</label>

<style>
	.toggle {
		display: inline-flex;
		width: var(--toggle-width);
		height: var(--toggle-height);
	}

	/* hide default checkbox */
	input {
		position: absolute;
		pointer-events: none;
		opacity: 0;
		width: 0;
		height: 0;
	}

	/* track */
	span {
		position: relative;
		width: 100%;
		height: 100%;
		background: var(--color-toggle-off);
		border-radius: var(--toggle-height);
		transition: 0.2s;
		cursor: pointer;
	}

	/* knob */
	span::before {
		position: absolute;
		content: "";
		height: calc(var(--toggle-height) * 0.9);
		width: calc(var(--toggle-height) * 0.9);
		left: calc(var(--toggle-height) * 0.05);
		top: calc(var(--toggle-height) * 0.05);
		background: var(--color-fg);
		border-radius: 50%;
		transition: 0.2s;
	}

	input:checked + span {
		background: var(--color-toggle-on);
	}

	input:checked + span::before {
		transform: translateX(calc(var(--toggle-width) - var(--toggle-height)));
	}
</style>
