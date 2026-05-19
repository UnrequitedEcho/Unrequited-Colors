import { ShaderPipeline } from "./ShaderPipeline.js";
import { ShaderPass, RadialBasisFunctionPass, BilateralFilterPass, DitherPass } from "./ShaderPasses.js";
import { Palette } from "./Palette.js";
import { Viewport } from "./Viewport.js";

// -----------------------------------------------------------------
// Viewport
// -----------------------------------------------------------------
const canvas = document.getElementById("canvas");
const viewport = new Viewport(canvas);

// -----------------------------------------------------------------
// Shader Pipeline
// -----------------------------------------------------------------
const shaderpipeline = new ShaderPipeline();

const rbf = new RadialBasisFunctionPass(true);
const rbfShaderSource = await fetch("./rfb.frag").then(r => r.text());
rbf.initProgram(shaderpipeline.gl, shaderpipeline.vs, rbfShaderSource);

const bf = new BilateralFilterPass(false);
const bfShaderSource = await fetch("./bilateral.frag").then(r => r.text());
bf.initProgram(shaderpipeline.gl, shaderpipeline.vs, bfShaderSource);

const rto = new ShaderPass(true);
const rtoShaderSource = await fetch("./rgbToOklab.frag").then(r => r.text());
rto.initProgram(shaderpipeline.gl, shaderpipeline.vs, rtoShaderSource);

const otr = new ShaderPass(true);
const otrShaderSource = await fetch("./oklabToRgb.frag").then(r => r.text());
otr.initProgram(shaderpipeline.gl, shaderpipeline.vs, otrShaderSource);

const dither = new DitherPass(false);
const ditherShaderSource =  await fetch("./dither.frag").then(r => r.text());
dither.initProgram(shaderpipeline.gl, shaderpipeline.vs, ditherShaderSource);

shaderpipeline.addPass("rto", rto);
shaderpipeline.addPass("bf", bf);
shaderpipeline.addPass("rfb", rbf);
shaderpipeline.addPass("dither", dither);
shaderpipeline.addPass("otr", otr);

let image = null;
let processed = null;

// -----------------------------------------------------------------
// Shaders Controls Setup
// -----------------------------------------------------------------

const shaderControls = document.getElementById("shaderControls");

shaderControls.appendChild(
    bf.createUI(() => {
        viewport.setProcessedImage(shaderpipeline.render());
        viewport.draw();
    })
);

shaderControls.appendChild(
    rbf.createUI(() => {
        viewport.setProcessedImage(shaderpipeline.render());
        viewport.draw();
    })
);

shaderControls.appendChild(
    dither.createUI(() => {
        viewport.setProcessedImage(shaderpipeline.render());
        viewport.draw();
    })
);

// -----------------------------------------------------------------
// Button Row
// -----------------------------------------------------------------
const openImageBtn = document.getElementById("openImage");
const imageInput = document.getElementById("imageInput");

openImageBtn.onclick = () => imageInput.click();

imageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();

    img.onload = async () => {
        image = img;
        shaderpipeline.setImage(image);
        viewport.setProcessedImage(shaderpipeline.render());
        viewport.resetTransform()
        viewport.draw();
    };

    img.src = URL.createObjectURL(file);
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
    rbf.setPalette(colors);
    viewport.setProcessedImage(shaderpipeline.render());
    viewport.draw();
});
palette.createUI(paletteContainer, presets);
