export class ColorTransfer {

    // ---------- Public API ----------

    setPalette(palette) {
        this.paletteSize = Math.min(palette.length, 32);

        for (let i = 0; i < this.paletteSize; i++) {
            const [l, a, b] = this._hexToOkLab(palette[i]);
            this.palette[i * 3 + 0] = l;
            this.palette[i * 3 + 1] = a;
            this.palette[i * 3 + 2] = b;
        }
    }

    setTemp(temperature) {
        if (temperature !== undefined) {
            this.temperature = temperature;
        }
    }

    setImage(image) {
        const gl = this.gl;

        this.canvas.width = image.width;
        this.canvas.height = image.height;

        gl.viewport(0, 0, image.width, image.height);

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            image
        );

        this.hasImage = true;
    }
    
    getProcessedImage() {
        if (!this.hasImage) return null;

        const gl = this.gl;

        gl.useProgram(this.program);

        // uniforms
        gl.uniform1i(this.u_image, 0);
        gl.uniform1i(this.u_paletteSize, this.paletteSize);
        gl.uniform1f(this.u_temperature, this.temperature);
        gl.uniform3fv(this.u_palette, this.palette);

        // bind texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // draw
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        return this.canvas;
    }

    async init() {
        this.palette = new Float32Array(32 * 3);
        this.paletteSize = 0;
        this.temperature = 0.1;
        this.hasImage = false;
        this.canvas = document.createElement("canvas");
        this.gl = this.canvas.getContext("webgl");

        const gl = this.gl;

        if (!gl) {
            throw new Error("WebGL not supported");
        }


        // Program creation
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, `
            attribute vec2 a_pos;
            varying vec2 v_uv;

            void main() {
                v_uv = (a_pos + 1.0) * 0.5;
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }
        `);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        const ucSource = await fetch("./unrequited-colors.frag").then(r => r.text());
        gl.shaderSource(fs, ucSource);
        gl.compileShader(fs);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
        gl.useProgram(this.program);

        // Quad Setup
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        // fullscreen quad (2 triangles)
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([
                -1, -1,
                 1, -1,
                -1,  1,
                -1,  1,
                 1, -1,
                 1,  1,
            ]),
            gl.STATIC_DRAW
        );

        const loc = gl.getAttribLocation(this.program, "a_pos");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        // variant locations
        this.u_image = gl.getUniformLocation(this.program, "u_image");
        this.u_palette = gl.getUniformLocation(this.program, "u_palette");
        this.u_paletteSize = gl.getUniformLocation(this.program, "u_paletteSize");
        this.u_temperature = gl.getUniformLocation(this.program, "u_temperature");

        this.texture = gl.createTexture();
    }

    // ---------- Internal ----------

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