export class ShaderPass {
    constructor(enabled) {
        this.enabled = enabled;
    }

    initProgram(gl, vs, fragmentSource) {
        this.gl = gl;

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fragmentSource);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(fs));
        }

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.bindAttribLocation(this.program, 0, "a_pos");
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(this.program));
        }

        this.u_image = gl.getUniformLocation(this.program, "u_image");
    }

    bind(inputTexture) {
        const gl = this.gl;

        gl.useProgram(this.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, inputTexture);

        gl.uniform1i(this.u_image, 0);
    }

    createUI({title, passControls, onToggle}) {
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
        function update() {
            root.classList.toggle("disabled", !toggle.checked);
            onToggle(toggle.checked);
        }
        toggle.onchange = update;
        update();
        
        if (passControls) {
            passControls.className = "pass-controls";
            root.appendChild(passControls);
        }

        return root;
    }

    static createControlSlider({
        label,
        defaultValue = 50, 
        transform = v => v,
        onInput = () => {}, 
        format = v => {
            if (v >= 10) return v.toFixed(0);
            if (v >= 1) return v.toFixed(1);
            return v.toFixed(2);
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
        }

        slider.onchange = () => {
            const value = transform(slider.value);
            onInput(value);
        };

        resetBtn.onclick = () => {
            slider.value = defaultValue;
            slider.oninput();
            slider.onchange();
        };

        resetBtn.click();

        sliderGroup.appendChild(headerRow);
        sliderGroup.appendChild(sliderRow);
        return sliderGroup;
    }
}

export class RadialBasisFunctionPass extends ShaderPass {
    constructor(enabled) {
        super(enabled);
        this.sigma = 0;
        this.palette = [];
        this.paletteSize = 0;
        this.chromaBias = 0;
    }

    initProgram(gl, vs, fragmentSource) {
        super.initProgram(gl, vs, fragmentSource);
        this.u_palette = gl.getUniformLocation(this.program, "u_palette");
        this.u_paletteSize = gl.getUniformLocation(this.program, "u_paletteSize");
        this.u_sigma = gl.getUniformLocation(this.program, "u_sigma");
        this.u_chromaBias = gl.getUniformLocation(this.program, "u_chromaBias");
    }

    bind(inputTexture) {
        super.bind(inputTexture);
        this.gl.uniform3fv(this.u_palette, this.palette);
        this.gl.uniform1i(this.u_paletteSize, this.paletteSize);
        this.gl.uniform1f(this.u_sigma, this.sigma);
        this.gl.uniform1f(this.u_chromaBias, this.chromaBias);
    }

    createUI(onChange) {
        const controls = document.createElement("div");

        controls.appendChild(
            ShaderPass.createControlSlider({ 
                label: "Color Mix",
                transform: v => {
                    const min = 0.01; const max = 0.5; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
                onInput: v => {
                    this.sigma = v;
                    onChange();
                }
            })
        );

        controls.appendChild(
            ShaderPass.createControlSlider({ 
                label: "More Colors", defaultValue: 0,
                transform: v => {
                    const min = 0; const max = 25; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
                onInput: v => {
                    this.chromaBias = v;
                    onChange();
                }
            })
        );

        return super.createUI({title: "Palettize", passControls: controls, 
            onToggle: enabled => {
                this.enabled = enabled;
                onChange();
            }
        });
    }

    setPalette(palette) {
        this.paletteSize = Math.min(palette.length, 32);

        for (let i = 0; i < this.paletteSize; i++) {
            const [l, a, b] = this._hexToOkLab(palette[i]);
            this.palette[i * 3 + 0] = l;
            this.palette[i * 3 + 1] = a;
            this.palette[i * 3 + 2] = b;
        }
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

export class BilateralFilterPass extends ShaderPass {
    constructor(enabled) {
        super(enabled);
        this.sigmaColor = 0;
        this.resolution = [0, 0];
        
        this.spatialWeights = [];
        const radius = 12;
        const facS = -1 / (2 * radius / 2 * radius / 2);
        for (let i = -radius; i <= radius; i++) {
            this.spatialWeights.push(Math.exp(facS * i * i));
        }
    }

    initProgram(gl, vs, fragmentSource) {
        super.initProgram(gl, vs, fragmentSource);
        this.u_sigmaColor = gl.getUniformLocation(this.program, "u_sigmaColor");
        this.u_resolution = gl.getUniformLocation(this.program, "u_resolution");
        this.u_spatialWeights = gl.getUniformLocation(this.program, "u_spatialWeights");
    }

    bind(inputTexture) {
        super.bind(inputTexture);
        
        this.gl.uniform1f(this.u_sigmaSpatial, this.sigmaSpatial);
        this.gl.uniform1f(this.u_sigmaColor, this.sigmaColor);
        this.gl.uniform2fv(this.u_resolution, this.resolution);
        this.gl.uniform1fv(this.u_spatialWeights, this.spatialWeights);
    }

    setSize(width, height) {
        this.resolution = [width, height];
    }

    createUI(onChange) {
        const controls = document.createElement("div");

        controls.appendChild(
            ShaderPass.createControlSlider({ 
                label: "Strength", defaultValue: 8,
                transform: v => {
                    const min = 0.01; const max = 0.25; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
                onInput: v => {
                    this.sigmaColor = v;
                    onChange();
                }
            })
        );

        return super.createUI({title: "Smart Blur", passControls: controls, 
            onToggle: enabled => {
                this.enabled = enabled;
                onChange();
            }
        });
    }
}

export class LumaGrainPass extends ShaderPass {
    constructor(enabled) {
        super(enabled);
        this.granularity = 1;
    }

    initProgram(gl, vs, fragmentSource) {
        super.initProgram(gl, vs, fragmentSource);
        this.u_granularity = gl.getUniformLocation(this.program, "u_granularity");
    }

    bind(inputTexture) {
        super.bind(inputTexture);
        this.gl.uniform1f(this.u_granularity, this.granularity);
    }

    createUI(onChange) {
        const controls = document.createElement("div");

        controls.appendChild(
            ShaderPass.createControlSlider({ label: "Strength", defaultValue: 10, 
                transform: v => {
                    const min = 0; const max = 15; const power = 2;
                    return min + (max - min) * Math.pow((v / 100), power);
                },
                onInput: v => {
                    this.granularity = v;
                    onChange();
                }
            })
        );

        return super.createUI({title: "Luma Grain", passControls: controls, 
            onToggle: enabled => {
                this.enabled = enabled;
                onChange();
            }
        });
    }
}

export class ColorAdjustPass extends ShaderPass {
    constructor(enabled) {
        super(enabled);
        this.contrast = 50;
        this.saturation = 50;
        this.shadows = 50;
        this.highlights = 50;
    }

    initProgram(gl, vs, fragmentSource) {
        super.initProgram(gl, vs, fragmentSource);
        this.u_contrast = gl.getUniformLocation(this.program, "u_contrast");
        this.u_saturation = gl.getUniformLocation(this.program, "u_saturation");
        this.u_shadows = gl.getUniformLocation(this.program, "u_shadows");
        this.u_highlights = gl.getUniformLocation(this.program, "u_highlights");
    }

    bind(inputTexture) {
        super.bind(inputTexture);
        this.gl.uniform1f(this.u_contrast, this.contrast);
        this.gl.uniform1f(this.u_saturation, this.saturation);
        this.gl.uniform1f(this.u_shadows, this.shadows);
        this.gl.uniform1f(this.u_highlights, this.highlights);
    }

    createUI(onChange) {
        const controls = document.createElement("div");

        controls.appendChild(
            ShaderPass.createControlSlider({ label: "Contrast", defaultValue: 50, 
                transform: v => { return (v - 50) / 50; },
                onInput: v => {
                    this.contrast = v;
                    onChange();
                }
            })
        );

        controls.appendChild(
            ShaderPass.createControlSlider({ label: "Saturation", defaultValue: 50, 
                transform: v => { return (v - 50) / 50; },
                onInput: v => {
                    this.saturation = v;
                    onChange();
                }
            })
        );

        controls.appendChild(
            ShaderPass.createControlSlider({ label: "Shadows", defaultValue: 50, 
                transform: v => { return (v - 50) / 50; },
                onInput: v => {
                    this.shadows = v;
                    onChange();
                }
            })
        );

        controls.appendChild(
            ShaderPass.createControlSlider({ label: "Highlights", defaultValue: 50, 
                transform: v => { return (v - 50) / 50; },
                onInput: v => {
                    this.highlights = v;
                    onChange();
                }
            })
        );

        return super.createUI({title: "Color Adjustments", passControls: controls, 
            onToggle: enabled => {
                this.enabled = enabled;
                onChange();
            }
        });
    }
}