import { ColorTransfer } from "./ColorTransfer.js";
import { Palette } from "./palette.js";
import { renderPalette } from "./palette.js";

const ct = new ColorTransfer();

let image = null;
let processed = null;

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

    img.onload = () => {
        image = img;

        ct.setImage(img);
        processed = ct.getProcessedImage();
        
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
    const canvas = ct.getProcessedImage();
    if (!canvas) return;

    canvas.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "palette-shift.png";
        a.click();
        URL.revokeObjectURL(a.href);
    });
};

// -----------------------------------------------------------------
// Canvas
// -----------------------------------------------------------------
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

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
    if (!image && !processed) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const source = showOriginal ? image : processed;
    if (!source) return;

    ctx.drawImage(
        source,
        offsetX,
        offsetY,
        source.width * scale,
        source.height * scale
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
// Toggle Original
// -----------------------------------------------------------------
let showOriginal = false;
const toggleBtn = document.getElementById("toggleView");

toggleBtn.onclick = () => {
    showOriginal = !showOriginal;
    toggleBtn.textContent = showOriginal ? "Show Processed" : "Show Original";
    draw();
};

// -----------------------------------------------------------------
// Parameters
// -----------------------------------------------------------------

// Temperature
const Tmin = 1e-3;
const Tmax = 0.3;
const tempSlider = document.getElementById("sliderTemp");
tempSlider.addEventListener("input", () => {
    const t = Number(tempSlider.value);
    const temperature = Tmin * Math.pow(Tmax / Tmin, t);
    ct.setTemp(temperature);
    processed = ct.getProcessedImage();
    draw();
});
tempSlider.dispatchEvent(new Event("input"));

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
    ct.setPalette(palette.getActiveColors());
    processed = ct.getProcessedImage();
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

