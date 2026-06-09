import type { EffectsState } from './state';
import { getUniformLocation } from './utils'

type StateKey = Exclude<keyof EffectsState, "enabled">;

export class Effect {
    stateKey: StateKey | null = null;
    requestCache = false;
    fsSource: string;
    program!: WebGLProgram;
    u_image!: WebGLUniformLocation;

    constructor(fsSource: string) {
        this.fsSource = fsSource;
    }

    makeProgram(gl: WebGL2RenderingContext, vs: WebGLShader) {
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fs) throw new Error("Effect: Could not create a fragment shader");
        gl.shaderSource(fs, this.fsSource);
        gl.compileShader(fs);

        this.program = gl.createProgram();
        if (!this.program) throw new Error("Effect: Could not create a program");
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.bindAttribLocation(this.program, 0, "a_pos");
        gl.linkProgram(this.program);

        this.u_image = getUniformLocation(gl, this.program, "u_image");
    }

    bindUniforms(gl: WebGL2RenderingContext, _effectsState: EffectsState) {
        gl.uniform1i(this.u_image, 0);
    }
}

export class BilateralFilterEffect extends Effect {
    stateKey: StateKey = "smartBlur";
    requestCache = true;
    u_sigmaColor!: WebGLUniformLocation;
    u_spatialWeights!: WebGLUniformLocation;
    spatialWeights: number[];

    constructor(fsSource: string) {
        super(fsSource);

        this.spatialWeights = [];
        const radius = 12;
        const facS = -1 / (2 * radius / 2 * radius / 2);
        for (let i = -radius; i <= radius; i++) {
            this.spatialWeights.push(Math.exp(facS * i * i));
        }
    }

    makeProgram(gl: WebGL2RenderingContext, vs: WebGLShader) {
        super.makeProgram(gl, vs);
        this.u_sigmaColor = getUniformLocation(gl, this.program, "u_sigmaColor");
        this.u_spatialWeights = getUniformLocation(gl, this.program, "u_spatialWeights");
    }

    bindUniforms(gl: WebGL2RenderingContext, effectsState: EffectsState) {
        const state = effectsState["smartBlur"];
        super.bindUniforms(gl, effectsState);
        gl.uniform1f(this.u_sigmaColor, Math.max(state.strength, 1e-8));
        gl.uniform1fv(this.u_spatialWeights, this.spatialWeights);
    }
}

export class RadialBasisFunctionEffect extends Effect {
    stateKey: StateKey = "palettization";
    u_sigma!: WebGLUniformLocation;
    u_palette!: WebGLUniformLocation;
    u_paletteSize!: WebGLUniformLocation;

    constructor(fsSource: string) {
        super(fsSource);
    }

    makeProgram(gl: WebGL2RenderingContext, vs: WebGLShader) {
        super.makeProgram(gl, vs);
        this.u_sigma = getUniformLocation(gl, this.program, "u_sigma");
        this.u_palette = getUniformLocation(gl, this.program, "u_palette");
        this.u_paletteSize = getUniformLocation(gl, this.program, "u_paletteSize");
    }

    bindUniforms(gl: WebGL2RenderingContext, effectsState: EffectsState) {
        const state = effectsState["palettization"];
        super.bindUniforms(gl, effectsState);
        gl.uniform1f(this.u_sigma, Math.max(state.colorMix, 1e-8));
        const colors = state.palette.colors;
        const palette = colors
            .filter((c) => c.enabled)
            .splice(0, 32)
            .flatMap((c) => this._hexToOkLab(c.color));

        gl.uniform3fv(this.u_palette, palette);
        gl.uniform1i(this.u_paletteSize, Math.floor(palette.length / 3));
    }


    _hexToOkLab(hex: string) {
        // remove leading #, convert hex to float between 0 and 1
        const bigint = parseInt(hex.slice(1), 16);

        const r = ((bigint >> 16) & 255) / 255;
        const g = ((bigint >> 8) & 255) / 255;
        const b = (bigint & 255) / 255;

        // rgb => srgb
        const toLinear = (c: number) =>
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

export class LumaGrainEffect extends Effect {
    stateKey: StateKey = "lumaGrain";
    u_granularity!: WebGLUniformLocation;

    constructor(fsSource: string) {
        super(fsSource);
    }

    makeProgram(gl: WebGL2RenderingContext, vs: WebGLShader) {
        super.makeProgram(gl, vs);
        this.u_granularity = getUniformLocation(gl, this.program, "u_granularity");
    }

    bindUniforms(gl: WebGL2RenderingContext, effectsState: EffectsState) {
        const state = effectsState["lumaGrain"];
        super.bindUniforms(gl, effectsState);
        gl.uniform1f(this.u_granularity, state.strength);
    }
}

export class ColorAdjustEffect extends Effect {
    stateKey: StateKey = "colorAdjustments";
    u_brightness!: WebGLUniformLocation;
    u_saturation!: WebGLUniformLocation;
    u_shadows!: WebGLUniformLocation;
    u_highlights!: WebGLUniformLocation;
    u_rotation!: WebGLUniformLocation;

    constructor(fsSource: string) {
        super(fsSource);
    }

    makeProgram(gl: WebGL2RenderingContext, vs: WebGLShader) {
        super.makeProgram(gl, vs);
        this.u_brightness = getUniformLocation(gl, this.program, "u_brightness");
        this.u_saturation = getUniformLocation(gl, this.program, "u_saturation");
        this.u_shadows = getUniformLocation(gl, this.program, "u_shadows");
        this.u_highlights = getUniformLocation(gl, this.program, "u_highlights");
        this.u_rotation = getUniformLocation(gl, this.program, "u_rotation");
    }

    bindUniforms(gl: WebGL2RenderingContext, effectsState: EffectsState) {
        const state = effectsState["colorAdjustments"];
        super.bindUniforms(gl, effectsState);
        gl.uniform1f(this.u_brightness, state.brightness);
        gl.uniform1f(this.u_saturation, state.saturation);
        gl.uniform1f(this.u_shadows, state.shadows);
        gl.uniform1f(this.u_highlights, state.highlights);
        gl.uniform1f(this.u_rotation, state.hue);
    }
}

