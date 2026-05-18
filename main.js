import { ShaderPipeline } from "./ShaderPipeline.js";
import { ShaderPass, RadialBasisFunctionPass, BilateralFilterPass, DitherPass } from "./ShaderPasses.js";
import { Palette } from "./palette.js";
import { renderPalette } from "./palette.js";

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
// Shader Controls
// -----------------------------------------------------------------

const shaderControls = document.getElementById("shaderControls");

shaderControls.appendChild(
    bf.createUI(() => {
        processed = shaderpipeline.render();
        draw();
    })
);

shaderControls.appendChild(
    rbf.createUI(() => {
        processed = shaderpipeline.render();
        draw();
    })
);

shaderControls.appendChild(
    dither.createUI(() => {
        processed = shaderpipeline.render();
        draw();
    })
);

// -----------------------------------------------------------------
// Open Image
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
        processed = shaderpipeline.render();
        resetTransform()
        draw();
    };

    img.src = URL.createObjectURL(file);
};

// -----------------------------------------------------------------
// Save Image
// -----------------------------------------------------------------
const saveBtn = document.getElementById("saveImage");

saveBtn.onclick = () => {
    const canvas = shaderpipeline.render();
    if (!canvas) return;

    canvas.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "palettized.png";
        a.click();
        URL.revokeObjectURL(a.href);
    });
};

// -----------------------------------------------------------------
// Canvas
// -----------------------------------------------------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", {
    alpha: false
});

let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;

resize();
window.addEventListener("resize", resize);
document.getElementById("resetView").onclick = () => {
    resetTransform();
    draw();
};

// draw
function draw() {
    if (!processed) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(
        processed,
        offsetX,
        offsetY,
        processed.width * scale,
        processed.height * scale
    );
}

// resize
function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    resetTransform();
    draw();
}

// center image
function resetTransform() {
    if (!processed) return;

    scale = Math.min(
            canvas.width / processed.width,
            canvas.height / processed.height
        );

    offsetX = (canvas.width - processed.width * scale) / 2;
    offsetY = (canvas.height - processed.height * scale) / 2;
}

// zoom (cursor-centered)
canvas.onwheel = e => {
    e.preventDefault();

    const zoom = e.deltaY < 0 ? 1.1 : 0.9;

    const mx = e.offsetX;
    const my = e.offsetY;

    offsetX = mx - (mx - offsetX) * zoom;
    offsetY = my - (my - offsetY) * zoom;

    scale *= zoom;

    draw();
};

// drag to pan
canvas.addEventListener("mousedown", e => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener("mouseup", () => {
    dragging = false;
});

window.addEventListener("mousemove", e => {
    if (!dragging) return;
    if (e.buttons === 0) return;

    offsetX += e.clientX - lastX;
    offsetY += e.clientY - lastY;

    lastX = e.clientX;
    lastY = e.clientY;

    draw();
});

// -----------------------------------------------------------------
// Palette
// -----------------------------------------------------------------
const presetSelect = document.getElementById("presetSelect");
const paletteContainer = document.getElementById("palette");

const palette = new Palette(() => {
    renderPalette(paletteContainer, palette.colors, (newColors) => {
        palette.set(newColors);
    });
    presetSelect.value = palette.preset ?? "custom";
    const colors = palette.getActiveColors();
    rbf.setPalette(colors);
    processed = shaderpipeline.render();
    draw();
});

// -----------------------------------------------------------------
// Palette Presets
// -----------------------------------------------------------------
const optCustom = document.createElement("option");
optCustom.value = "custom";
optCustom.textContent = "Custom";
optCustom.disabled = true;
presetSelect.appendChild(optCustom);

const presets = await fetch("palettes.json").then(r => r.json());

presets.forEach((p, i) => {
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.textContent = p.name;
    presetSelect.appendChild(opt);
});

presetSelect.onchange = () => {
    if (presetSelect.value === "custom") return;

    const p = presets.find(p => p.name === presetSelect.value);
    palette.set(p.colors, { preset: p.name });
};

// Initialization
if (presets.length > 0) {
    const p = presets[0];
    presetSelect.value = p.name;
    palette.set(p.colors, { preset: p.name });
} else {
    presetSelect.value = "custom";
}

// -----------------------------------------------------------------
// Palette Import
// -----------------------------------------------------------------
document.getElementById("openPalette").onclick = () => {
    document.getElementById("paletteFile").click();
};

document.getElementById("paletteFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        const text = reader.result;
        const matches = text.match(/[0-9a-fA-F]{6}/g) || [];
        const seen = new Set();
        const colors = [];

        for (const hex of matches) {
            const color = "#" + hex.toLowerCase();

            if (!seen.has(color)) {
                seen.add(color);
                colors.push(color);

                if (colors.length === 32) break;
            }
        }

        if (colors.length === 0) {
            alert("No valid colors found.");
            return;
        }

        palette.set(colors);
        presetSelect.value = "custom";
    };

    reader.readAsText(file);
};



