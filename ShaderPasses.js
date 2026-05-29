export class Effect {
    static async create(enabled, shaderPath) {
        const fsSource = await fetch(`${shaderPath}?t=${Date.now()}`).then(r => r.text());
        //const fsSource = await fetch(shaderPath).then(r => r.text());
        return new this(enabled, fsSource);
    }

    constructor(enabled, fsSource) {
        this.enabled = enabled;
        this.changed = true;
        this.fsSource = fsSource;
    }

    makeGlProgram(gl, vs) {
        this.gl = gl;

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, this.fsSource);
        gl.compileShader(fs);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.bindAttribLocation(this.program, 0, "a_pos");
        gl.linkProgram(this.program);

        this.u_image = gl.getUniformLocation(this.program, "u_image");
    }

    setUniforms() {
        this.gl.useProgram(this.program);
        this.gl.uniform1i(this.u_image, 0);
    }
}

export class EffectWithUI extends Effect {
    makeUI(title, container, onChange = () => {}) {
        this.onChange = () => {
            this.changed = true;
            onChange();
        }

        const root = document.createElement("div");
        root.className = "pass";

        // Title Row
        const titleRow = document.createElement("div");
        titleRow.className = "pass-title-row";

        const label = document.createElement("span");
        label.textContent = title;
        titleRow.appendChild(label);

        const switchEl = document.createElement("label");
        switchEl.className = "switch";
        const toggle = document.createElement("input");
        toggle.type = "checkbox";
        toggle.className = "toggle";
        toggle.checked = this.enabled;
        switchEl.appendChild(toggle);
        const slider = document.createElement("span");
        slider.className = "switch-slider";
        switchEl.appendChild(slider);
        titleRow.appendChild(switchEl);

        root.appendChild(titleRow);

        // Toggle behavior
        const update = () => {
            root.classList.toggle("disabled", !toggle.checked);
            this.enabled = toggle.checked;
            this.onChange();
        }
        toggle.onchange = update;
        update();
        
        if (this.makeControls) {
            const controls = document.createElement("div");
            controls.className = "pass-controls";
            this.makeControls(controls);
            root.appendChild(controls);
        }

        container.appendChild(root);
    }

    makeControlSlider({
        object = this,
        property = null,
        label = "Default Slider",
        defaultValue = 50, 
        transform = v => v,
        format = v => {
            if (v >= 10) return v.toFixed(0);
            if (v >= 1) return v.toFixed(1);
            if (v >= 0.1) return v.toFixed(2);
            return v.toFixed(3);
        }
    }) {
        const sliderGroup = document.createElement("div");
        sliderGroup.className = "slider-group";

        // Header Row: label and value
        const headerRow = document.createElement("div");
        headerRow.className = "slider-headerRow";
        const labelEl = document.createElement("label");
        labelEl.textContent = label;
        headerRow.appendChild(labelEl);
        const valueEl = document.createElement("span");
        headerRow.appendChild(valueEl);

        // SliderRow: slider resetbtn
        const sliderRow = document.createElement("div");
        sliderRow.className = "slider-sliderRow";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "slider";
        sliderRow.appendChild(slider);
        const resetBtn = document.createElement("button");
        resetBtn.className = "slider-reset";
        resetBtn.textContent = "⟲";
        sliderRow.appendChild(resetBtn);

        // Events
        slider.oninput = () => {
            const value = transform(slider.value);
            valueEl.textContent = format(value);
            object[property] = value;
            this.onChange(value);
        }

        resetBtn.onclick = () => {
            slider.value = defaultValue;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        };

        sliderGroup.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? -1 : 1;
            slider.value = +slider.value + delta;
            slider.oninput();
        }

        resetBtn.click();

        sliderGroup.appendChild(headerRow);
        sliderGroup.appendChild(sliderRow);
        return sliderGroup;
    }
}

export class CachableEffectWithUI extends EffectWithUI {
    constructor(...args) {
        super(...args);
        this.textureCache = null;
    }
}

export class RadialBasisFunctionEffect extends EffectWithUI {
    constructor(...args) {
        super(...args);
        this.sigma = 0;
        this.palette = [];
        this.paletteSize = 0;
        this.chromaBias = 0;
    }

    makeGlProgram(gl, vs) {
        super.makeGlProgram(gl, vs);
        this.u_palette = gl.getUniformLocation(this.program, "u_palette");
        this.u_paletteSize = gl.getUniformLocation(this.program, "u_paletteSize");
        this.u_sigma = gl.getUniformLocation(this.program, "u_sigma");
        this.u_chromaBias = gl.getUniformLocation(this.program, "u_chromaBias");
    }

    setUniforms() {
        super.setUniforms();
        this.gl.uniform3fv(this.u_palette, this.palette);
        this.gl.uniform1i(this.u_paletteSize, this.paletteSize);
        this.gl.uniform1f(this.u_sigma, this.sigma);
        this.gl.uniform1f(this.u_chromaBias, this.chromaBias);
    }

    makeUI(...args) {
        super.makeUI("Palettize", ...args);
    }

    makeControls(controls) {
        controls.appendChild(
            this.makeControlSlider({
                label: "Color Mix",
                property: "sigma",
                transform: v => {
                    const min = 0.01; const max = 0.5; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
            })
        );

        controls.appendChild(
            this.makeControlSlider({
                label: "More Colors", 
                property: "chromaBias",
                defaultValue: 0,
                transform: v => {
                    const min = 0; const max = 25; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
            })
        );
    }

    setPalette(palette) {
        this.paletteSize = Math.min(palette.length, 32);

        for (let i = 0; i < this.paletteSize; i++) {
            const [l, a, b] = this._hexToOkLab(palette[i]);
            this.palette[i * 3 + 0] = l;
            this.palette[i * 3 + 1] = a;
            this.palette[i * 3 + 2] = b;
        }

        this.onChange();
    }

    _hexToOkLab(hex) {
        // remove leading #, convert hex to float between 0 and 1
        const bigint = parseInt(hex.slice(1), 16);

        const r = ((bigint >> 16) & 255) / 255;
        const g = ((bigint >> 8) & 255) / 255;
        const b = (bigint & 255) / 255;

        // rgb => srgb
        const toLinear = c =>
        c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

        const lr = toLinear(r);
        const lg = toLinear(g);
        const lb = toLinear(b);

        // srgb => lms
        const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
        const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
        const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

        // lms => oklab
        const okl = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
        const oka = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
        const okb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

        return [okl, oka, okb];
    }
}

export class BilateralFilterEffect extends CachableEffectWithUI {
    constructor(...args) {
        super(...args);
        this.sigmaColor = 0;
        this.spatialWeights = [];
        const radius = 12;
        const facS = -1 / (2 * radius / 2 * radius / 2);
        for (let i = -radius; i <= radius; i++) {
            this.spatialWeights.push(Math.exp(facS * i * i));
        }
    }

    makeGlProgram(gl, vs) {
        super.makeGlProgram(gl, vs);
        this.u_sigmaColor = gl.getUniformLocation(this.program, "u_sigmaColor");
        this.u_spatialWeights = gl.getUniformLocation(this.program, "u_spatialWeights");
    }

    setUniforms() {
        super.setUniforms();
        this.gl.uniform1f(this.u_sigmaSpatial, this.sigmaSpatial);
        this.gl.uniform1f(this.u_sigmaColor, this.sigmaColor);
        this.gl.uniform1fv(this.u_spatialWeights, this.spatialWeights);
    }

    makeUI(...args) {
        super.makeUI("Smart Blur", ...args);
    }

    makeControls(controls) {
        controls.appendChild(
            this.makeControlSlider({ 
                label: "Strength",
                property: "sigmaColor",
                defaultValue: 8,
                transform: v => {
                    const min = 0.01; const max = 0.25; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                }
            })
        );
    }
}

export class LumaGrainEffect extends EffectWithUI {
    constructor(...args) {
        super(...args);
        this.granularity = 1;
    }

    makeGlProgram(gl, vs) {
        super.makeGlProgram(gl, vs);
        this.u_granularity = gl.getUniformLocation(this.program, "u_granularity");
    }

    setUniforms() {
        super.setUniforms();
        this.gl.uniform1f(this.u_granularity, this.granularity);
    }

    makeUI(...args) {
        super.makeUI("Luma Grain", ...args);
    }

    makeControls(controls) {
        controls.appendChild(
            this.makeControlSlider({ 
                label: "Strength",
                property: "granularity", 
                defaultValue: 10, 
                transform: v => {
                    const min = 0; const max = 15; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
            })
        );
    }
}

export class ColorAdjustEffect extends EffectWithUI {
    constructor(...args) {
        super(...args);
        this.contrast = 50;
        this.saturation = 50;
        this.shadows = 50;
        this.highlights = 50;
    }

    makeGlProgram(gl, vs) {
        super.makeGlProgram(gl, vs);
        this.u_contrast = gl.getUniformLocation(this.program, "u_contrast");
        this.u_saturation = gl.getUniformLocation(this.program, "u_saturation");
        this.u_shadows = gl.getUniformLocation(this.program, "u_shadows");
        this.u_highlights = gl.getUniformLocation(this.program, "u_highlights");
    }

    setUniforms() {
        super.setUniforms();
        this.gl.uniform1f(this.u_contrast, this.contrast);
        this.gl.uniform1f(this.u_saturation, this.saturation);
        this.gl.uniform1f(this.u_shadows, this.shadows);
        this.gl.uniform1f(this.u_highlights, this.highlights);
    }

    makeUI(...args) {
        super.makeUI("Color Adjustments", ...args);
    }

    makeControls(controls) {
        controls.appendChild(
            this.makeControlSlider({ 
                label: "Contrast",
                property: "contrast",
                transform: v => { return (v - 50) / 50; }
            })
        );

        controls.appendChild(
            this.makeControlSlider({ 
                label: "Saturation",
                property: "saturation",
                transform: v => { return (v - 50) / 50; }
            })
        );

        controls.appendChild(
            this.makeControlSlider({ 
                label: "Shadows",
                property: "shadows",
                transform: v => { return (v - 50) / 50; }
            })
        );

        controls.appendChild(
            this.makeControlSlider({ 
                label: "Highlights",
                property: "highlights",
                transform: v => { return (v - 50) / 50; }
            })
        );
    }
}
