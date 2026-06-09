<script lang="ts">
    import ImageToolbar from './components/ImageToolbar.svelte';
    import ImageMeta from './components/ImageMeta.svelte';
    import Effects from './components/Effects.svelte'
    import Crop from './components/Crop.svelte'
    import Preview from './components/Preview.svelte'
    import { onMount, setContext } from 'svelte'; 

    let { renderer, palettePresets } = $props();
    // svelte-ignore state_referenced_locally
    setContext('renderer', renderer);
    // svelte-ignore state_referenced_locally
    setContext('palette-presets', palettePresets);

    onMount(() => {
        const resize = () => { windowWidth = window.innerWidth; };
        window.addEventListener('resize', resize);
        return () => {
            window.removeEventListener('resize', resize);
        };
    });

    let requestedSidebarWidth = $state(320);
    let windowWidth = $state(window.innerWidth);
    let sidebarWidth = $derived(Math.max(200, Math.min(requestedSidebarWidth, windowWidth * 0.4)));
    function resizeSidebar(e: PointerEvent) {
        e.preventDefault();
        const move = (e: PointerEvent) => {
            requestedSidebarWidth = e.clientX;
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
    <div class="title">
        <h1>Unrequited Colors</h1>
        <a
            href="https://github.com/UnrequitedEcho/unrequited-colors"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
        >
            <img src={`${import.meta.env.BASE_URL}github.svg`} alt="GitHub" width="30" height="30">
        </a>
    </div>
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

    .title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 10px 0px;
        
        img {
            filter: invert(20%);
            transition: all 0.2s ease;
            &:hover {
                filter: invert(0%);
            }

            @media (prefers-color-scheme: light) {
                filter: invert(90%);

                &:hover {
                    filter: invert(70%);
                }
            }
        }
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