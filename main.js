import { Renderer } from "./Renderer.js";
import * as ShaderPasses from './ShaderPasses.js';
import { Palette } from "./Palette.js";
import { Viewport } from "./Viewport.js";



// -----------------------------------------------------------------
// Shaders
// -----------------------------------------------------------------
const canvas = document.getElementById("preview-canvas");
const renderer = new Renderer(canvas, 1500);

const effectsConfig = {  
    rgbToOklab:      { Object: ShaderPasses.Effect,                     enabled: true,  path: './rgbToOklab.frag', },  
    bilateralFilter: { Object: ShaderPasses.BilateralFilterEffect,      enabled: false, path: './bilateral.frag',  },  
    colorAdjust:     { Object: ShaderPasses.ColorAdjustEffect,          enabled: false, path: './colors.frag',     },
    rbf:             { Object: ShaderPasses.RadialBasisFunctionEffect,  enabled: true,  path: './rfb.frag',        },  
    lumaGrain:       { Object: ShaderPasses.LumaGrainEffect,            enabled: false, path: './dither.frag',     },
    oklabToRgb:      { Object: ShaderPasses.Effect,                     enabled: true,  path: './oklabToRgb.frag', },  
};

const effectsContainer = document.getElementById("effects");

let effects = {}
for (const [id, config] of Object.entries(effectsConfig)) {
    const effect = await config.Object.create(config.enabled, config.path);
    if (effect.makeUI) effect.makeUI(
        effectsContainer, 
        () => { renderer.render(); }, 
    );
    effects[id] = effect;
}
renderer.makePipelines(Object.values(effects))

const globalEffectsToggle = document.getElementById("global-effects-toggle");
globalEffectsToggle.onchange = () => {
    if (globalEffectsToggle.checked) {
        effectsContainer.classList.remove("disabled");
        renderer.showOriginal = false;
        renderer.present();
    } else {
        effectsContainer.classList.add("disabled");
        renderer.showOriginal = true;
        renderer.present();
    }
}

// -----------------------------------------------------------------
// Palette
// -----------------------------------------------------------------
const paletteContainer = document.getElementById("palette");
const presets = await fetch("./palettes.json").then(r => r.json());
const palette = new Palette((colors) => {
    effects.rbf.setPalette(colors);
});
palette.createUI(paletteContainer, presets);

// -----------------------------------------------------------------
// Import Button
// -----------------------------------------------------------------
async function importImage(file) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const maxTextureSize = renderer.getMaxTextureSize();
    const canvas = document.createElement("canvas");;
    let scale = 1;

    if (img.width > maxTextureSize || img.height > maxTextureSize) {
        scale = Math.min(maxTextureSize / img.width, maxTextureSize / img.height, 1);
        alert(`Image scaled to ${scale * 100}% to fit GPU limits: ${maxTextureSize}px`);
    } 

    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(img.src);
    return canvas;
}

let imagename;
const openImageBtn = document.getElementById("openImage");
openImageBtn.onclick = () => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        imagename = file.name.slice(0, file.name.lastIndexOf("."));
        const img = await importImage(file);

        renderer.setImage(img);
        renderer.resetTransform();
        renderer.render();
    };

    input.click();
};

// -----------------------------------------------------------------
// Save Button
// -----------------------------------------------------------------
const saveBtn = document.getElementById("saveImage");
saveBtn.onclick = () => {
    const saveCanvas = renderer.export();
    if (!saveCanvas) return;

    const filename = `${imagename}-${palette.preset ?? "colorized"}.png`;

    saveCanvas.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }, "image/png");
};

// -----------------------------------------------------------------
// ResetView Button
// -----------------------------------------------------------------
const resetBtn = document.getElementById("resetView")
resetBtn.onclick = () => {
    renderer.resetTransform();
}

// DEBUG: AutoLoad Debug Image

async function importImageFromUrl(url) {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    canvas.getContext("2d").drawImage(img, 0, 0);

    return canvas;
}
const img = await importImageFromUrl('./debug.jpeg');
renderer.setImage(img);
renderer.render();

