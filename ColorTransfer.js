const fsCode = `
precision highp float;

varying vec2 v_uv;

uniform sampler2D u_image;
uniform vec3 u_palette[32];     // in oklab
uniform int u_paletteSize;
uniform float u_temperature;

// https://bottosson.github.io/posts/oklab
vec3 rgb_to_oklab(vec3 c) {
    
    vec3 lrgb = mix(
        c / 12.92,
        pow((c + 0.055) / 1.055, vec3(2.4)),
        step(0.04045, c)
    );

    float l = dot(lrgb, vec3(0.4122214708, 0.5363325363, 0.0514459929));
    float m = dot(lrgb, vec3(0.2119034982, 0.6806995451, 0.1073969566));
    float s = dot(lrgb, vec3(0.0883024619, 0.2817188376, 0.6299787005));

    vec3 lms = vec3(
	    pow(l, 1.0/3.0),
	    pow(m, 1.0/3.0),
	    pow(s, 1.0/3.0)
	);

    return vec3(
        dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)),
        dot(lms, vec3(1.9779984951, -2.4285922050, 0.4505937099)),
        dot(lms, vec3(0.0259040371, 0.7827717662, -0.8086757660))
    );
}

// https://bottosson.github.io/posts/oklab
vec3 oklab_to_rgb(vec3 c) {

    float L = c.x, a = c.y, b = c.z;

    vec3 lms = vec3(
        L + 0.3963377774*a + 0.2158037573*b,
        L - 0.1055613458*a - 0.0638541728*b,
        L - 0.0894841775*a - 1.2914855480*b
    );

    lms = lms * lms * lms;

    vec3 rgb = vec3(
        dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
        dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
        dot(lms, vec3(-0.0041960863, -0.7034186147, 1.7076147010))
    );

    return mix(
        12.92 * rgb,
        1.055 * pow(rgb, vec3(1.0/2.4)) - 0.055,
        step(0.0031308, rgb)
    );
}

void main() {
    // vec2 uv = v_uv, but webgl textures are upside down !
    vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);

    vec3 rgb = texture2D(u_image, uv).rgb;

    vec3 x = rgb_to_oklab(rgb);

    float d_min = 1e9;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        vec3 c = u_palette[i];
        float d = dot(x - c, x - c);

        d_min = min(d_min, d);
    }

    float weights[32];
    float sum = 0.0;

    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        vec3 c = u_palette[i];
        float d = dot(x - c, x - c);

        float w = exp(-pow((d - d_min) / u_temperature, 2.0));

        weights[i] = w;
        sum += w;
    }

    sum = max(sum, 1e-9);

    vec3 result = vec3(0.0);

    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        vec3 c = u_palette[i];
        result += (weights[i] / sum) * c;
    }

    vec3 out_rgb = oklab_to_rgb(result);

    gl_FragColor = vec4(out_rgb, 1.0);
}
`;

export class ColorTransfer {
    constructor() {
        this.hasImage = false;
        this.canvas = document.createElement("canvas");
        this.gl = this.canvas.getContext("webgl");

        if (!this.gl) {
            throw new Error("WebGL not supported");
        }

        this.program = this._createProgram();
        this.gl.useProgram(this.program);

        this._setupQuad();
        this._getLocations();

        this.palette = new Float32Array(32 * 3);
        this.paletteSize = 0;
        this.temperature = 0.1;

        this.texture = this.gl.createTexture();
    }

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

    // ---------- Internal ----------

    _createProgram() {
        const gl = this.gl;

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
        gl.shaderSource(fs, fsCode);
        gl.compileShader(fs);

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        return program;
    }

    _setupQuad() {
        const gl = this.gl;

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
    }

    _getLocations() {
        const gl = this.gl;

        this.u_image = gl.getUniformLocation(this.program, "u_image");
        this.u_palette = gl.getUniformLocation(this.program, "u_palette");
        this.u_paletteSize = gl.getUniformLocation(this.program, "u_paletteSize");
        this.u_temperature = gl.getUniformLocation(this.program, "u_temperature");
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