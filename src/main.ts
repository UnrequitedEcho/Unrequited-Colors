import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import * as Effects from './effects'
import { Renderer } from './renderer'
import type { PalettePreset } from './utils'

async function createEffects() {
    const effectsConfig = [ 
        { Object: Effects.Effect,                     path: 'rgbToOklab.frag', },  
        { Object: Effects.BilateralFilterEffect,      path: 'bilateral.frag',  },  
        { Object: Effects.ColorAdjustEffect,          path: 'colors.frag',     },
        { Object: Effects.RadialBasisFunctionEffect,  path: 'rbf.frag',        },  
        { Object: Effects.LumaGrainEffect,            path: 'dither.frag',     },
        { Object: Effects.Effect,                     path: 'oklabToRgb.frag', },  
    ];

    const effects = [];
    for (const cfg of effectsConfig) {
        const shaderSource = await fetch(`${import.meta.env.BASE_URL}shaders/${cfg.path}`).then(r => r.text());
        effects.push(new cfg.Object(shaderSource));
    }

    return effects;
}
const effects = await createEffects();
const renderer = new Renderer(effects);

async function loadPalettePresets() {
    const presets = await fetch('./palettes.json').then(r => r.json());
    if (!presets) {
        alert("Could not fetch palette presets");
        return [];
    }
    return presets;
}
const palettePresets = await loadPalettePresets();
palettePresets.sort((a: PalettePreset, b: PalettePreset) => a.name > b.name);

const app = mount(App, {
    target: document.getElementById('app')!,
    props: { renderer, palettePresets }
})

export default app
