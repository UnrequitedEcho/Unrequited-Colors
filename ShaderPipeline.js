import { OutputPass } from './ShaderPasses.js';

export class Renderer {
    constructor(lowResSize = 1000, onImageReady) {
        this.fullResPipeline = new ShaderPipeline(OutputPass);
		this.lowResPipeline =  new ShaderPipeline(OutputPass, lowResSize);
        this.currentCanvas = null;

		this.onImageReady = onImageReady;

        this.renderVersion = 0;

		this.hasImage = false;
        this.imageWidth = 0;
        this.imageHeight = 0
    }

    async render() {
    	if (!this.hasImage) return;
        const version = ++this.renderVersion;

        this.currentCanvas = this.lowResPipeline.render();
        this.onImageReady(this.currentCanvas, this.imageWidth, this.imageHeight);

        await new Promise(requestAnimationFrame);

        if (version !== this.renderVersion) return;
        const result = this.fullResPipeline.render();
        if (version !== this.renderVersion) return;
        this.currentCanvas = result;
        this.onImageReady(this.currentCanvas, this.imageWidth, this.imageHeight);
    }

    renderLowRes() {
    	if (!this.hasImage) return;
    	const version = ++this.renderVersion;
    	this.currentCanvas = this.lowResPipeline.render();
    	this.onImageReady(this.currentCanvas, this.imageWidth, this.imageHeight);
    }

    renderExport() {
    	if (!this.hasImage) return;
    	return this.fullResPipeline.render();
    }

    addPass(name, effect, fsSource) {
    	for (const pipeline of [this.fullResPipeline, this.lowResPipeline]) {
    		pipeline.passes.push({
	    		name: name, 
	    		pass: effect.createPass(pipeline.gl, pipeline.vs, fsSource)
	    	});
    	}
    }

    setImage(image) {
    	this.fullResPipeline.setImage(image);
		this.lowResPipeline.setImage(image);
		this.imageWidth = image.width;
		this.imageHeight = image.height;
		this.hasImage = true;
    }

    setGlobalEffectsStatus(status) {
    	this.fullResPipeline.skipAllPasses = status;
    	this.lowResPipeline.skipAllPasses = status;
    	this.render();
    }

    getMaxTextureSize() {
    	const gl = this.fullResPipeline.gl;
    	return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
}

export class ShaderPipeline {
	constructor(OutputPassObject, maxSize = null) {
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

        this.texture = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, this.texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        // shaderpasses
        this.passes = [];
		this.outputPass = new OutputPassObject(this.gl, this.vs);

		this.skipAllPasses = false;
		this.maxSize = maxSize;
	}

	addPass(name, pass) {
		this.passes.push({ name: name, pass: pass});
	}

	setImage(image) {
		const gl = this.gl;

		// resize the image
		if (this.maxSize) { 
			const scale = Math.min(1, this.maxSize / Math.max(image.width, image.height));

			const resized = document.createElement("canvas");
			const ctx = resized.getContext("2d");
			resized.width = Math.round(image.width * scale);
			resized.height = Math.round(image.height * scale);
			ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, resized.width, resized.height);
			image = resized;
		}

		// resize the buffers to the image
		this.canvas.width = image.width;
		this.canvas.height = image.height;

		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

		for (const target of this.buffers) {
			gl.bindTexture(gl.TEXTURE_2D, target.texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height,
	    		0, gl.RGBA, gl.FLOAT, null
			);
		}
	}

	render() {
		const gl = this.gl;
		
		let currentTexture = this.texture;
		let read = this.buffers[0];
		let write = this.buffers[1];
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);

		gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		for (const { pass } of this.passes) {
			if (!pass.effect.enabled || this.skipAllPasses) continue; 
			if (pass.setSize) pass.setSize(this.canvas.width, this.canvas.height);

			gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
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

