<script lang="ts">
	let { options, value = $bindable() } = $props();
	const uid = $props.id();
</script>

<div class="radio-row">
	{#each options as option}
		<label>
			<input type=radio name={uid} value={option} bind:group={value}>
			<span>{option}</span>
		</label>
	{/each}
</div>

<style>
	.radio-row {
        display: flex;
        justify-content: space-between;
    }

    label { flex: 1; }

    input { display: none; }

    span {
    	display: block;
    	padding: 6px 0;
    	text-align: center;
    	cursor: pointer;
    	background: var(--color-bg-alt);
    	border-top: 1px solid var(--color-border);
    	border-right: 1px solid var(--color-border);
    	border-bottom: 1px solid var(--color-border);
	    transition: all 0.2s ease;

	    &:hover { background: var(--color-hover); }
	}

    label input:checked + span {
    	background: var(--color-fg);
    	color: var(--color-bg);
    }

    label:first-child span {
    	border-left: 1px solid var(--color-border);
    	border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
    }

    label:last-child span {
        border-top-right-radius: 4px;
        border-bottom-right-radius: 4px;
    }
</style>