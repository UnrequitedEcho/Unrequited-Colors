<script lang="ts">
	import Toggle from './Toggle.svelte'

	let { name, enabled = $bindable() } = $props();
</script>

<div>
	<span>{name}</span>
	<Toggle bind:value={enabled}/>
</div>

<style>
	div {
		width: 100%;
		display: flex;
		align-items: center;
	}

	span { 
		flex: 1 1 auto;
		font-size: 12px;
		font-weight: bold;
	}
</style>