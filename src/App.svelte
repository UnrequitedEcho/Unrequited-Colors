<script lang="ts">
    import ImageToolbar from './components/ImageToolbar.svelte';
    import ImageMeta from './components/ImageMeta.svelte';
    import Effects from './components/Effects.svelte'
    import Crop from './components/Crop.svelte'
    import Preview from './components/Preview.svelte'
    import { setContext } from 'svelte'; 

    let { renderer, palettePresets } = $props();
    // svelte-ignore state_referenced_locally
    setContext('renderer', renderer);
    // svelte-ignore state_referenced_locally
    setContext('palette-presets', palettePresets);

    let sidebarWidth = $state(300);
    function resizeSidebar(e: PointerEvent) {
        e.preventDefault();
        const move = (e: PointerEvent) => {
            sidebarWidth = Math.max(200, e.clientX);
        }
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        }
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    }

</script>

<aside style={`width:${sidebarWidth}px`}>
    <h1>Unrequited Colors</h1>
    <ImageToolbar/>
    <ImageMeta/>
    <hr>
    <Effects/>
    <hr>
    <Crop/>
</aside>
<div 
    role="separator"
    id="resize-handle" 
    onpointerdown={resizeSidebar}
></div>
<Preview/>


<style>
    aside {
        height: 100vh;
        padding: 2px 14px;
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: var(--color-bg);
        overflow: auto;
    }

    hr {
        border: none;
        border-top: 1px solid var(--color-border);
        margin: 2px 0;
    }

    #resize-handle {
        width: 4px;
        height: 100vh;
        flex: 0 0 auto;
        cursor: ew-resize;
        background: var(--color-border);
    }
</style>