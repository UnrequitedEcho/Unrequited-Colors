import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import * as Effects from './effects'
import { Renderer } from './renderer'

async function createEffects() {
    const effectsConfig = [ 
        { Object: Effects.Effect,                     path: './shaders/rgbToOklab.frag', },  
        { Object: Effects.BilateralFilterEffect,      path: './shaders/bilateral.frag',  },  
        { Object: Effects.ColorAdjustEffect,          path: './shaders/colors.frag',     },
        { Object: Effects.RadialBasisFunctionEffect,  path: './shaders/rbf.frag',        },  
        { Object: Effects.LumaGrainEffect,            path: './shaders/dither.frag',     },
        { Object: Effects.Effect,                     path: './shaders/oklabToRgb.frag', },  
    ];

    const effects = [];
    for (const cfg of effectsConfig) {
        const shaderSource = await fetch(cfg.path).then(r => r.text());
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

const app = mount(App, {
    target: document.getElementById('app')!,
    props: { renderer, palettePresets }
})

export default app
