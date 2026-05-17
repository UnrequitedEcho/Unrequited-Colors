export class ShaderPipeline {
	constructor() {
		this.canvas = document.createElement("canvas");
		this.gl = this.canvas.getContext("webgl");
		if (!this.gl) { throw new Error("WebGL not supported"); }
		const gl = this.gl;

		// float texture extensions
		this.floatTexExt = gl.getExtension("OES_texture_float");
		this.floatRTTExt = gl.getExtension("WEBGL_color_buffer_float");

		if (!this.floatTexExt || !this.floatRTTExt) {
		    throw new Error("Float textures not supported");
		}

		this.quadBuffer = this._initFullscreenQuad();
		this.buffers = [
		    this._createRenderTarget(),
		    this._createRenderTarget()
		];

		// vertex shader
		this.vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vs, `
            attribute vec2 a_pos;
            varying vec2 v_uv;

            void main() {
                v_uv = (a_pos + 1.0) * 0.5;
                gl_Position = vec4(a_pos, 0.0, 1.0);
            }
        `);
        gl.compileShader(this.vs);
        if (!gl.getShaderParameter(this.vs, gl.COMPILE_STATUS)) {
		    console.error(gl.getShaderInfoLog(this.vs));
		}

        // shaderpasses
        this.passes = [];
		this.outputPass = new OutputPass();
		this.outputPass.initProgram(gl, this.vs);

		this.inputTexture = null;
	}

	addPass(name, pass) {
		this.passes.push({ name: name, pass: pass});
	}

	removePass(name) {
		this.passes = this.passes.filter(p => p.name !== name);
	}

	setImage(image) {
		const gl = this.gl;

		// resize the buffers
		this.canvas.width = image.width;
		this.canvas.height = image.height;

		for (const target of this.buffers) {
			gl.bindTexture(gl.TEXTURE_2D, target.texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height,
	    		0, gl.RGBA, gl.FLOAT, null
			);
		}

		// create texture
		this.inputTexture = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
	}

	render() {
		const gl = this.gl;
		
		if (!this.inputTexture) { return null; }

		let currentTexture = this.inputTexture;
		let read = this.buffers[0];
		let write = this.buffers[1];
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

		gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		for (const { pass } of this.passes) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);

			const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			if (status !== gl.FRAMEBUFFER_COMPLETE) {
			    console.error("Framebuffer incomplete:", status);
			}

			gl.viewport(0, 0, this.canvas.width, this.canvas.height);
			pass.bind(currentTexture);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			currentTexture = write.texture;
			[read, write] = [write, read];
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.outputPass.bind(currentTexture);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		return this.canvas;
	}

	_createRenderTarget() {
		const gl = this.gl;
		const texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		return {texture, framebuffer};
	}

	_initFullscreenQuad() {
		const gl = this.gl;

		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

		gl.bufferData(
			gl.ARRAY_BUFFER, 
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW
		);

		return buffer;
	}
}

export class OutputPass {
    initProgram(gl, vs) {
        this.gl = gl;
        // Fragment Shader
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, 
`
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_image;
void main() {
    gl_FragColor = texture2D(u_image, v_uv);
}
`
        );
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
		    console.error(gl.getShaderInfoLog(fs));
		}

        // GL program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.bindAttribLocation(this.program, 0, "a_pos");
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
		    console.error(gl.getProgramInfoLog(this.program));
		}

        // Uniform locations
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