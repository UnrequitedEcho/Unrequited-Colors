import { ShaderPipeline } from "./ShaderPipeline.js";
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
async function setupShaders(shadersConfig) {
    let shaders = {};
    for (const [id, config] of Object.entries(shadersConfig)) {
        const pass = new config.Class(config.enabled);
        const shaderSrc = await fetch(config.path).then(r => r.text());
        pass.initProgram(shaderpipeline.gl, shaderpipeline.vs, shaderSrc);
        shaderpipeline.addPass(id, pass);
        if (config.ui) {
            effectsContainer.appendChild(pass.createUI(() => {
                viewport.setImage(shaderpipeline.render());
                viewport.draw();
            }))
        }
        shaders[id] = pass;
    }
    return shaders;
}

const shaderpipeline = new ShaderPipeline();
const shadersConfig = {  
    rgbToOklab:      { Class: ShaderPasses.ShaderPass,               enabled: true,  path: './rgbToOklab.frag', ui: false },  
    bilateralFilter: { Class: ShaderPasses.BilateralFilterPass,      enabled: false, path: './bilateral.frag',  ui: true },  
    rbf:             { Class: ShaderPasses.RadialBasisFunctionPass,  enabled: true,  path: './rfb.frag',        ui: true },  
    lumaGrain:       { Class: ShaderPasses.LumaGrainPass,            enabled: false, path: './dither.frag',     ui: true },
    oklabToRgb:      { Class: ShaderPasses.ShaderPass,               enabled: true,  path: './oklabToRgb.frag', ui: false },  
};

const effectsContainer = document.getElementById("effects");
const shaders = await setupShaders(shadersConfig);

const globalEffectsToggle = document.getElementById("global-effects-toggle");
globalEffectsToggle.onchange = () => {
    if (globalEffectsToggle.checked) {
        effectsContainer.classList.remove("disabled");
        shaderpipeline.skipAllPasses = false;
        viewport.setImage(shaderpipeline.render());
        viewport.draw()
    } else {
        effectsContainer.classList.add("disabled");
        shaderpipeline.skipAllPasses = true;
        viewport.setImage(shaderpipeline.render());
        viewport.draw()
    }
}

// -----------------------------------------------------------------
// Button Row
// -----------------------------------------------------------------
async function importImage(file) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();

    const maxTextureSize = shaderpipeline.gl.getParameter(shaderpipeline.gl.MAX_TEXTURE_SIZE);
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

        shaderpipeline.setImage(img);
        viewport.setImage(shaderpipeline.render());
        viewport.resetTransform();
        viewport.draw();
    };

    input.click();
};

const saveBtn = document.getElementById("saveImage");
saveBtn.onclick = () => {
    const saveCanvas = shaderpipeline.render();
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
    shaders.rbf.setPalette(colors);
    viewport.setImage(shaderpipeline.render());
    viewport.draw();
});
palette.createUI(paletteContainer, presets);
