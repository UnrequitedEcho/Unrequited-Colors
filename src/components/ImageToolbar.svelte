<script lang="ts">
    import { getContext } from 'svelte';
	import { sourceImage, cropState, resetPreviewRequest } from '../state';
    import type { Renderer } from '../renderer';

	const renderer: Renderer = getContext('renderer');

	async function openImage() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'image/*';

		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const bitmap = await createImageBitmap(file);
			sourceImage.set({
				filename: file.name,
				bitmap: bitmap
			});
			cropState.update((c) => ({
				...c,
				centerX: bitmap.width / 2,
				centerY: bitmap.height / 2,
				scale: bitmap.width / (bitmap.width / bitmap.height),
				rotation: 0,
				aspectRatio: bitmap.width / bitmap.height
			}));

			resetPreviewRequest.update(x => x + 1);
		};

		input.click();
	}

	async function exportImage() {
		if (!$sourceImage) return;

		const blob = await renderer.export();
		if (!blob) return;

		const url = URL.createObjectURL(blob);

		const a = document.createElement("a");
		a.href = url;
		a.download = $sourceImage.filename;
		a.click();

		URL.revokeObjectURL(url);
	}

	function resetPreview() {
		resetPreviewRequest.update(x => x + 1);
	}

</script>

<section id=image-toolbar>
	<button onclick={openImage}>Open Image</button>
	<button onclick={exportImage}>Save Image</button>
	<button onclick={resetPreview}>Reset Preview</button>
</section>

<style>
	#image-toolbar {
		display: flex;
		justify-content: space-around;
		gap: 8px;
	}
</style>
