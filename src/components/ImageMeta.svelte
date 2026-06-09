<script lang="ts">
	import { sourceImage, cropState } from '../state';

	let size = $derived.by(() => {
		let width = 0;
		let height = 0;
		if ($cropState.enabled) {
			width = $cropState.aspectRatio * $cropState.height;
			height = $cropState.height;
		}
		else if ($sourceImage) {
			width = $sourceImage.bitmap.width;
			height = $sourceImage.bitmap.height;
		}
		return `${Math.floor(width)}x${Math.floor(height)}`;
	})

	function updateFilename(name: string) {
		sourceImage.update((img) => 
			img ? {...img, filename:name } : img
		);
	}
</script>

<section id=image-meta>
	<input 
		type=text id=image-name 
		value={$sourceImage?.filename ?? ''}
		oninput={(e) => updateFilename(e.currentTarget.value)}
	>
	<span class=numeric-display>{size}</span>
</section>

<style>
	#image-meta {
		display: flex;
		justify-content: space-between;
		gap: 8px;
	}

	#image-name {
		flex: 1 1 auto;width: 100%;
	    padding: 4px 6px;
	    outline: none;
	    border: 1px solid var(--color-border);
	}

	span {
		padding: 0px 6px;
	}
</style>