import { createPassContainer, createSlider } from "./UI_Elements.js";

export class ShaderPass {
    constructor() {
        this.enabled = true;
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
}

export class RadialBasisFunctionPass extends ShaderPass {
    constructor() {
        super();
        this.sigma = 0.2;
        this.palette = [];
        this.paletteSize = 0;
    }

    async initProgram(gl, vs, fragmentSource) {
        super.initProgram(gl, vs, fragmentSource);
        this.u_palette = gl.getUniformLocation(this.program, "u_palette");
        this.u_paletteSize = gl.getUniformLocation(this.program, "u_paletteSize");
        this.u_sigma = gl.getUniformLocation(this.program, "u_sigma");
    }

    bind(inputTexture) {
        super.bind(inputTexture);
        
        this.gl.uniform3fv(this.u_palette, this.palette);
        this.gl.uniform1i(this.u_paletteSize, this.paletteSize);
        this.gl.uniform1f(this.u_sigma, this.sigma);
    }

    createUI(onChange) {
        const controls = document.createElement("div");

        controls.appendChild(
            createSlider({
                label: "Sigma",
                min: 0.01,
                max: 0.4,
                value: this.sigma,

                onInput: v => {
                    this.sigma = v;
                    onChange();
                }
            })
        );

        return createPassContainer({
            title: "Radial Basis Function",
            enabled: this.enabled,

            content: controls,

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
