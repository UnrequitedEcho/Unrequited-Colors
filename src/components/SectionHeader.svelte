<script lang="ts">
	import Toggle from './Toggle.svelte'
	export let title: string;
	export let enabled: boolean;
</script>

<div>
	<h2>{title}</h2>
	<Toggle bind:value={enabled}/>
</div>

<style>
	div {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h2 {  
		font-size: 18px; 
		margin: 0;
	}
</style>