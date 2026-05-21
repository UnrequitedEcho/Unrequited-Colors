import { Renderer, ShaderPipeline } from "./ShaderPipeline.js";
import * as ShaderPasses from './ShaderPasses.js';
import { Palette } from "./Palette.js";
import { Viewport } from "./Viewport.js";

// -----------------------------------------------------------------
// Viewport
// -----------------------------------------------------------------
const canvas = document.getElementById("preview-canvas");
const viewport = new Viewport(canvas);

// -----------------------------------------------------------------
// Shader Pipeline
// -----------------------------------------------------------------

const renderer = new Renderer(
    1000, 
    (image, logicalWidth, logicalHeight) => {
        viewport.setImage(image, logicalWidth, logicalHeight);
        viewport.draw();
    }
);

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
    const effect = new config.Object(config.enabled, () => { renderer.render(); });
    if (effect.makeUI) effect.makeUI(effectsContainer);
    const shaderSrc = await fetch(config.path).then(r => r.text());
    renderer.addPass(id, effect, shaderSrc);
    effects[id] = effect;
}

const globalEffectsToggle = document.getElementById("global-effects-toggle");
globalEffectsToggle.onchange = () => {
    if (globalEffectsToggle.checked) {
        effectsContainer.classList.remove("disabled");
        renderer.setGlobalEffectsStatus(false);
    } else {
        effectsContainer.classList.add("disabled");
        renderer.setGlobalEffectsStatus(true);
    }
}

// -----------------------------------------------------------------
// Button Row
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

const openImageBtn = document.getElementById("openImage");
openImageBtn.onclick = () => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const img = await importImage(file);

        renderer.setImage(img);
        renderer.render();
        viewport.resetTransform();
        viewport.draw();
    };

    input.click();
};

const saveBtn = document.getElementById("saveImage");
saveBtn.onclick = () => {
    const saveCanvas = renderer.export();
    if (!saveCanvas) return;

    saveCanvas.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "palettized.png";
        a.click();
        URL.revokeObjectURL(a.href);
    });
};

const resetBtn = document.getElementById("resetView")
resetBtn.onclick = () => {
    viewport.resetTransform();
    viewport.draw();
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


// DEBUG: AutoLoad Debug Image

// async function importImageFromUrl(url) {
//     const img = new Image();
//     img.src = url;
//     await img.decode();

//     const canvas = document.createElement("canvas");
//     canvas.width = img.width;
//     canvas.height = img.height;

//     canvas.getContext("2d").drawImage(img, 0, 0);

//     return canvas;
// }
// const img = await importImageFromUrl('./debug.jpeg');
// renderer.setImage(img);
// renderer.render();

