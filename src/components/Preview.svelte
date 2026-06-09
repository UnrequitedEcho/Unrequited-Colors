<script lang="ts">
	import { previewState, cropState, sourceImage, resetPreviewRequest } from '../state';
	import { onMount, getContext, untrack } from 'svelte'; 
	import { canvasToImage, clampToImageBounds } from '../utils'
    import type { Renderer } from '../renderer';

	let canvas: HTMLCanvasElement;

	onMount(() => {
		const renderer: Renderer = getContext('renderer');
		renderer.attachCanvas(canvas);

	    const ro = new ResizeObserver(([entry]) => {
		    const width = Math.round(entry.contentRect.width);
		    const height = Math.round(entry.contentRect.height);

		    canvas.width = width;
		    canvas.height = height;

		    previewState.update(p => ({
		        ...p,
		        canvasWidth: width,
		        canvasHeight: height
		    }));
		});
		ro.observe(canvas);

	    return () => ro.disconnect();
	});
	
	function getCanvasPos(e: PointerEvent) {
		const canvasRect = canvas.getBoundingClientRect();
		return {
	        x: (e.clientX - canvasRect.left) * (canvas.width / canvasRect.width),
	        y: (e.clientY - canvasRect.top) * (canvas.height / canvasRect.height)
	    };
	}

	function onWheel(e: WheelEvent) {
		e.preventDefault();
		if (!$sourceImage) return;
		if ($previewState.mode === 'cropEdit' && e.shiftKey) {
			const factor = e.deltaY < 0 ? 0.9 : 1.1;
			const offset = e.deltaY < 0 ? -1 : 1;
			let newScale = e.ctrlKey ? $cropState.scale : $cropState.scale * factor;
			let newRotation = e.ctrlKey ? $cropState.rotation + offset : $cropState.rotation

			const [centerX, centerY, scale] =  clampToImageBounds(
				$sourceImage.bitmap.width, $sourceImage.bitmap.height,
				$cropState.centerX, $cropState.centerY,
				newScale, newRotation, $cropState.aspectRatio
			);
			cropState.update((c) => ({
				...c, centerX, centerY, scale, rotation: newRotation
			}));
			return;
		}


		const zoom = e.deltaY < 0 ? 1.1 : 0.9;
		const mx = e.offsetX;
        const my = e.offsetY;
        previewState.update((p) => ({
        	...p, 
        	offsetX: mx - (mx - p.offsetX) * zoom,
        	offsetY: my - (my - p.offsetY) * zoom, 
        	scale: p.scale * zoom
        }))
	}

	function pointerDown(e: PointerEvent) {
        e.preventDefault();
		if (!$sourceImage) return;
        let lastPos = getCanvasPos(e);

        const pointerMove = (e: PointerEvent) => {
			const canvasPos = getCanvasPos(e);
        	if ($previewState.mode === 'cropEdit' && e.shiftKey) {
        		const [imagePosX, imagePosY] = canvasToImage(
        			canvasPos.x, canvasPos.y,
        			$sourceImage.bitmap.width, $sourceImage.bitmap.height,
        			$previewState.offsetX, $previewState.offsetY,
        			$previewState.scale, $cropState.rotation
        		);
        		console.log(imagePosX, imagePosY);
	        	const [centerX, centerY, scale] =  clampToImageBounds(
					$sourceImage.bitmap.width, $sourceImage.bitmap.height,
					imagePosX, imagePosY,
					$cropState.scale, $cropState.rotation, $cropState.aspectRatio
				);
				cropState.update((c) => ({
					...c, centerX, centerY, scale
				}));
				return;
        	}

			previewState.update((p) => ({
				...p, 
				offsetX: p.offsetX + canvasPos.x - lastPos.x,
				offsetY: p.offsetY + canvasPos.y - lastPos.y
			}))
			lastPos = canvasPos;
		}

        const pointerup = () => {
            window.removeEventListener('pointermove', pointerMove);
            window.removeEventListener('pointerup', pointerup);
        }

        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerup);
    }

    $effect(() => {
    	if ($resetPreviewRequest === 0) return;
    	untrack(() => {
	        resetPreview();
	    });
    })

    function resetPreview() {
    	if (!$sourceImage) return;
    	const canvasRect = canvas.getBoundingClientRect();

    	let scale = Math.min(
    		canvasRect.width / $sourceImage.bitmap.width,
    		canvasRect.height / $sourceImage.bitmap.height
    	)

    	let offsetX = (canvasRect.width - $sourceImage.bitmap.width * scale) / 2;
    	let offsetY = (canvasRect.height - $sourceImage.bitmap.height * scale) / 2;


    	if ($cropState.enabled) {
		    const cropHeight = $cropState.scale;
		    const cropWidth = $cropState.scale * $cropState.aspectRatio;

		    scale = Math.min(
		        canvasRect.width / cropWidth,
		        canvasRect.height / cropHeight
		    );

		    offsetX = canvasRect.width / 2 - $cropState.centerX * scale;
		    offsetY = canvasRect.height / 2 - $cropState.centerY * scale;
		}

    	previewState.update((p) => ({
    		...p, scale, offsetX, offsetY
    	}));
    }

</script>

<canvas 
	id="preview"
	bind:this={canvas}
	onwheel={onWheel}
	onpointerdown={pointerDown}
></canvas>

<style>
	canvas {
		height: 100vh;
		width: 100%;
	}
</style>