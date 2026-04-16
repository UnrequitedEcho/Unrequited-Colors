import { ColorTransfer } from "./ColorTransfer.js";

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
// Palette Swatches
// -----------------------------------------------------------------
const paletteEl = document.getElementById("palette");

// initialization
addPlusButton();

function addSwatch(color) {
    const div = document.createElement("div");
    div.className = "swatch";
    div.style.background = color;
    div.dataset.color = color;

    div.onclick = () => {
        const input = document.createElement("input");
        input.type = "color";
        input.value = color;

        input.oninput = (e) => {
            const newColor = e.target.value;
            div.style.background = newColor;
            div.dataset.color = newColor;
            updateShaderPalette();
        };

        input.click();
    };

    div.oncontextmenu = (e) => {
        e.preventDefault();

        div.remove();
        updateShaderPalette();
        updatePlusButton();
    };

    paletteEl.insertBefore(div, paletteEl.querySelector(".add"));
    updateShaderPalette();
    updatePlusButton();
}

function updatePlusButton() {
    const paletteLength = paletteEl.querySelectorAll(".swatch:not(.add)").length;
    const plus = paletteEl.querySelector(".add");
    if (paletteLength >= 32) {
        plus.style.display = "none";
    } else {
        plus.style.display = "";
    }
}

function addPlusButton() {
    const div = document.createElement("div");
    div.className = "swatch add";
    div.textContent = "+";

    div.onclick = () => {
        addSwatch("#888888");
    };

    paletteEl.appendChild(div);
}

function getPalette() {
    const swatches = document.querySelectorAll("#palette .swatch:not(.add)");

    const palette = [];

    swatches.forEach(s => {
        const hex = s.dataset.color;

        const rgb = hexToRgb(hex);
        const oklab = rgbToOklab(rgb);
        palette.push(oklab);
    });

    return palette;
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);

    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;

    return [r, g, b];
}

function rgbToOklab([r, g, b]) {
    const toLinear = c =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    const lr = toLinear(r);
    const lg = toLinear(g);
    const lb = toLinear(b);

    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return [
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    ];
}

function updateShaderPalette() {
    ct.setPalette(getPalette());
    processed = ct.getProcessedImage();
    draw();
}
    
// -----------------------------------------------------------------
// Palette Import / Presets
// -----------------------------------------------------------------
document.getElementById("openPalette").onclick = () => {
    document.getElementById("paletteFile").click();
};

const presetSelect = document.getElementById("presetSelect");
fetch("palettes.json")
    .then(res => res.json())
    .then(palettes => {
        palettes.forEach((p, i) => {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = p.name;
            presetSelect.appendChild(opt);
        });

        presetSelect.onchange = () => {
            const p = palettes[presetSelect.value];
            loadPalette(p.colors);
        };

        if (palettes.length > 0) {
            presetSelect.value = 0;
            loadPalette(palettes[0].colors);
        }
    });

document.getElementById("paletteFile").onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        const text = reader.result;
        const colors = parsePaletteText(text);

        if (colors.length === 0) {
            alert("No valid colors found.");
            return;
        }

        loadPalette(colors);
    };

    reader.readAsText(file);
};

function parsePaletteText(text) {
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

    return colors;
}

function loadPalette(colors) {
    // clear existing (except + button)
    const swatches = document.querySelectorAll("#palette .swatch:not(.add)");
    swatches.forEach(s => s.remove());

    const unique = [...new Set(colors)].slice(0, 32);

    // add new colors
    unique.forEach(addSwatch);

    draw();
}
