export class DisplayView {
	constructor(canvas) {
		this.canvas = canvas;		
		this.canvas.width = canvas.clientWidth;
		this.canvas.height = canvas.clientHeight;

		this.gl = this.canvas.getContext("webgl2");
		if (!this.gl) { throw new Error("WebGL not supported"); }
		const gl = this.gl;
		gl.disable(gl.DITHER);
		gl.enable(gl.SCISSOR_TEST);

		// Setup fullscreen quad
		this.quadBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		const quadBufferDataArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadBufferDataArray), gl.STATIC_DRAW);

		// Display Shader GL program		
		this.vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(this.vs, vsSource);
        gl.compileShader(this.vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        this.displayProgram = gl.createProgram();
        gl.attachShader(this.displayProgram, this.vs);
        gl.attachShader(this.displayProgram, fs);
        gl.bindAttribLocation(this.displayProgram, 0, "a_pos");
        gl.linkProgram(this.displayProgram);

        // Display shader uniforms
        this.u_image = gl.getUniformLocation(this.displayProgram, "u_image");
        this.u_scale = gl.getUniformLocation(this.displayProgram, "u_scale");
        this.u_offset = gl.getUniformLocation(this.displayProgram, "u_offset");
        this.u_canvasSize = gl.getUniformLocation(this.displayProgram, "u_canvasSize");
        this.u_imageSize = gl.getUniformLocation(this.displayProgram, "u_imageSize");
        this.u_cropEnabled = gl.getUniformLocation(this.displayProgram, "u_cropEnabled");
        this.u_cropCenter = gl.getUniformLocation(this.displayProgram, "u_cropCenter");
        this.u_cropSize = gl.getUniformLocation(this.displayProgram, "u_cropSize");
        this.u_cropRotation = gl.getUniformLocation(this.displayProgram, "u_cropRotation");

        // Display state
        this.scale = 1;
		this.offset = {x: 0, y: 0};
		this.cropEnabled = false;
		this.cropCenter = {x: 0, y: 0};
		this.cropSize = {width: 0, height: 0};
		this.cropRotation = 0;

		// Interaction state
		this.interactionHandler = null;
		this.dragging = false;
		this.lastPos = {x: 0, y: 0};

		this.renderResult;
	}

	present(renderResult) {
		if (renderResult) this.renderResult = renderResult;
		if (!this.renderResult) return;

		const gl = this.gl;

		console.log(this.cropEnabled, this.cropCenter, this.cropSize, this.cropRotation);

	    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
	    gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.scissor(0, 0, this.canvas.width, this.canvas.height);

        gl.useProgram(this.displayProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.renderResult.texture);
        gl.uniform1i(this.u_image, 0);
        gl.uniform1f(this.u_scale, this.scale);
        gl.uniform2f(this.u_offset, this.offset.x, this.offset.y);
        gl.uniform2f(this.u_canvasSize, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.u_imageSize, this.renderResult.size.width, this.renderResult.size.height);
        gl.uniform1i(this.u_cropEnabled, this.cropEnabled);
        gl.uniform2f(this.u_cropCenter, this.cropCenter.x, this.cropCenter.y);
        gl.uniform2f(this.u_cropSize, this.cropSize.width, this.cropSize.height);
        gl.uniform1f(this.u_cropRotation, this.cropRotation);

        gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	setCrop(cropEnabled, cropCenter, cropSize, cropRotation) {
		this.cropEnabled = cropEnabled;
		this.cropCenter = cropCenter;
		this.cropSize = cropSize;
		this.cropRotation = cropRotation;
		this.present();
	}

	resetTransform(size = null) {
		size = size ? size : this.renderResult
		if (!size) return

		this.scale = Math.min(
			this.canvas.width / size.width,
			this.canvas.height / size.height
		);

		this.offset.x = (this.canvas.width - size.width * this.scale) / 2
		this.offset.y = (this.canvas.height - size.height * this.scale) / 2
		this.present();
	}

    canvasToImage(canvasPos) {
    	return {
		    x: (canvasPos.x - this.offset.x) / this.scale,
		    y: (canvasPos.y - this.offset.y) / this.scale,
		};
    }
}

export class Renderer {
	constructor(gl, quadBuffer, onRenderComplete) {
		this.gl = gl;
		this.quadBuffer = quadBuffer;
		this.onRenderComplete = onRenderComplete;

		this.extColorBufferFloat = gl.getExtension("EXT_color_buffer_float");
		if (!this.extColorBufferFloat) {
		    throw new Error("EXT_color_buffer_float not supported");
		}

		this.tileSize = Math.round(gl.getParameter(gl.MAX_TEXTURE_SIZE) / 16);
		this.originalImageTexture = this.createTexture(gl.NEAREST);
		this.resultTexture = this.createTexture(gl.NEAREST);

	    this.buffers = [
	    	this.createRenderTarget(),
	    	this.createRenderTarget()
	    ]

	    this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		this.hasImage = false;
		this.pendingRenderRAF = null;
	}

	setEffects(effects, vs) {
		this.hasEffects = true;
		this.effects = effects;
		this.effects.forEach((effect) => { effect.makeGlProgram(this.gl, vs) });

		// Create textures for effects with cache
		for (const effect of this.effects) {
	    	if (!('textureCache' in effect)) continue;
	    	effect.textureCache = this.createTexture(this.gl.NEAREST);
	    }
	}

	setImage(image) {
		const gl = this.gl;

		// Resize the texture for the original and the result
		gl.bindTexture(gl.TEXTURE_2D, this.originalImageTexture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

	    gl.bindTexture(gl.TEXTURE_2D, this.resultTexture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

	    // Resize the ping pong textures
		for (const buffer of this.buffers) {
		    gl.bindTexture(gl.TEXTURE_2D, buffer.texture);

		    gl.texImage2D(
		        gl.TEXTURE_2D, 0, gl.RGBA16F, image.width, image.height,
		        0, gl.RGBA, gl.HALF_FLOAT, null
		    );
		}

		// Resize effect caches
		for (const effect of this.effects) {
			effect.changed = true;
			if (!('textureCache' in effect)) continue;
		    gl.bindTexture(gl.TEXTURE_2D, effect.textureCache);
		    gl.texImage2D(
		        gl.TEXTURE_2D, 0, gl.RGBA16F, image.width, image.height,
		        0, gl.RGBA, gl.HALF_FLOAT, null
		    );
		}
		
		this.hasImage = true;
		this.height = image.height;
		this.width = image.width;
	}

	render(showOriginal = false) {
		if (!this.hasImage) return null;
		if (!this.hasEffects) showOriginal = true;

		// Cancel previously started renders
		if (this.pendingRenderRAF) {
			cancelAnimationFrame(this.pendingRenderRAF);
			this.pendingRenderRAF = null;
		}

		this.beginRender(this.tileSize, this.tileSize, showOriginal);
		
		let renderTime = 0;
		let frames = 1;
		const renderFrame = () => {
			const startTime = performance.now();
		    const res = this.renderSome(10);
		    renderTime += performance.now() - startTime;

		    if (res) {
		        console.log(`Rendered in ${renderTime}ms over ${frames} frames`);
		        this.onRenderComplete({texture: res, size: {width: this.width, height: this.height}});
		    }
			else {
		        this.pendingRenderRAF = requestAnimationFrame(renderFrame);
		        frames++;
		    }
		};
		this.pendingRenderRAF = requestAnimationFrame(renderFrame);
	}

	export() {
		if (!this.hasImage) return;

		this.beginRender(this.tileSize, this.tileSize);
		return this.renderSome(0);
	}

	getMaxTextureSize() {
    	return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    }

	beginRender(tileWidth, tileHeight, skipEffects = false) {
		this.tileWidth = tileWidth > this.width ? this.width : tileWidth;
		this.tileHeight = tileHeight > this.height ? this.height: tileHeight;

		this.currentTexture = this.originalImageTexture;
		this.currentEffectIdx = 0;
		this.activeEffects = skipEffects
		    ? []
		    : this.effects.filter(effect => effect.enabled);

		for (let i = 0; i < this.activeEffects.length; i++) {
			const effect = this.activeEffects[i];
			if (effect.changed) break;
			if (effect.textureCache) {
				this.currentEffectIdx = i + 1;
				this.currentTexture = effect.textureCache;
			}
		}

		console.log(`Rendering the pipeline: ${this.activeEffects.map(e => e.constructor.name)} starting at index ${this.currentEffectIdx}`);
		
		this.currentTileX = 0;
		this.currentTileY = 0;
		this.readBuffer = this.buffers[0];
		this.writeBuffer = this.buffers[1];
	}

	renderSome(frameBudgetMs = 0) {
		const startTime = performance.now();
		this.gl.viewport(0, 0, this.width, this.height);

		while (true) {
			if (frameBudgetMs > 0 && performance.now() - startTime > frameBudgetMs) {
				return null;
			}

		    // Rendering complete
	        if (this.currentEffectIdx >= this.activeEffects.length) {
	        	if (this.currentEffectIdx === 0) return this.originalImageTexture;
	        	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.readBuffer.framebuffer);
	            this.gl.bindTexture(this.gl.TEXTURE_2D, this.resultTexture);
	            this.gl.copyTexSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height);
	            return this.resultTexture;
	        }

			const tileWidth = Math.min(this.tileWidth, this.width - this.currentTileX);
			const tileHeight = Math.min(this.tileHeight, this.height - this.currentTileY);
			const effect = this.activeEffects[this.currentEffectIdx];

	        this.renderTile(
	        	this.currentTexture, this.writeBuffer.framebuffer, 
	        	this.currentTileX, this.currentTileY,
	        	tileWidth, tileHeight, effect
	        );
	        
	        // Advance tile position
	        this.currentTileX += tileWidth;
	        if (this.currentTileX >= this.width) {
	            this.currentTileX = 0;
	            this.currentTileY += tileHeight;
	        }

	        // Advance effect
	        if (this.currentTileY >= this.height) {
	            this.currentTileY = 0;
	            this.currentEffectIdx++;
	            this.currentTexture = this.writeBuffer.texture;
	            effect.changed = false;
	            if ('textureCache' in effect) {
	            	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.writeBuffer.framebuffer);
	            	this.gl.bindTexture(this.gl.TEXTURE_2D, effect.textureCache);
	            	this.gl.copyTexSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height);
	            }
				[this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer]
	        }  
    	}
	}

	renderTile(sourceTexture, writeBuf, x, y, width, height, effect) {
		const gl = this.gl;
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, writeBuf);
	    this.gl.scissor(x, y, width, height);

		gl.bindVertexArray(this.vao);
		gl.useProgram(effect.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        effect.setUniforms();

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.finish();
	}

	createRenderTarget() {
		const gl = this.gl;
		const texture = this.createTexture(gl.NEAREST);
		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		return {texture, framebuffer};
	}

	createTexture(filter) {
		const gl = this.gl;

		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

		return texture;
	}
}

const vsSource = `#version 300 es
precision highp float; 

in vec2 a_pos;
out vec2 v_uv;

void main() {
    v_uv = (a_pos + 1.0) * 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const fsSource = `#version 300 es
precision highp float; 

in vec2 v_uv; 
out vec4 fragColor;
uniform sampler2D u_image; 
uniform float u_scale; 
uniform vec2 u_offset; 
uniform vec2 u_canvasSize; 
uniform vec2 u_imageSize;
uniform bool u_cropEnabled;
uniform vec2 u_cropCenter;
uniform vec2 u_cropSize;
uniform float u_cropRotation;

void main() { 
	vec2 screenPx = vec2(
	    v_uv.x * u_canvasSize.x,
	    (1.0 - v_uv.y) * u_canvasSize.y
	);
	vec2 imagePx = (screenPx - u_offset) / u_scale; 
	vec2 uv = imagePx / u_imageSize; 

	// regualar image bounds
	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { 
		fragColor = vec4(0.0); 
		return; 
	} 

	// crop overlay
	if (u_cropEnabled) {
		vec2 local = imagePx - u_cropCenter;
		float s = sin(-u_cropRotation);
		float c = cos(-u_cropRotation);
		local = vec2(local.x * c - local.y * s, local.x * s + local.y * c);
		vec2 halfSize = u_cropSize * 0.5;
		
		if (!(abs(local.x) <= halfSize.x && abs(local.y) <= halfSize.y)) {
			vec3 x = texture(u_image, uv).rgb;
			fragColor = vec4(x * 0.5, 0.);
			return;
		}
	}

	// on the image
	fragColor = texture(u_image, uv);
}
`