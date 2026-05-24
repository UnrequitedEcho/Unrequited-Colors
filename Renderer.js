export class Renderer {
	constructor(canvas, previewMaxSize = 1500) {
		this.canvas = canvas;
		this.gl = this.canvas.getContext("webgl2");
		if (!this.gl) { throw new Error("WebGL not supported"); }
		const gl = this.gl;

		this.extColorBufferFloat = gl.getExtension("EXT_color_buffer_float");

		if (!this.extColorBufferFloat) {
		    throw new Error("EXT_color_buffer_float not supported");
		}

		gl.disable(gl.DITHER);
		gl.enable(gl.SCISSOR_TEST);

		// Setup fullscreen quad
		this.quadBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		const quadBufferDataArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadBufferDataArray), gl.STATIC_DRAW);

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		//gl.bindVertexArray(null);

		// Display Shader setup		
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

        this.u_image = gl.getUniformLocation(this.displayProgram, "u_image");
        this.u_scale = gl.getUniformLocation(this.displayProgram, "u_scale");
        this.u_offset = gl.getUniformLocation(this.displayProgram, "u_offset");
        this.u_canvasSize = gl.getUniformLocation(this.displayProgram, "u_canvasSize");
        this.u_imageSize = gl.getUniformLocation(this.displayProgram, "u_imageSize");

        this.scale = 1;
		this.offsetX = 0;
		this.offsetY = 0;

		// Interaction state
		this.dragging = false;
		this.lastX = 0;
		this.lastY = 0;

		this.canvas.width = this.canvas.clientWidth;
		this.canvas.height = this.canvas.clientHeight;

		this.displayTexture = null;

		this.previewMaxSize = previewMaxSize;

		this.originalImageTexture = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, this.originalImageTexture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	    this.hasImage = false;
		this.originalWidth;
		this.originalHeight;
		this.showPreview = false;
		this.showOriginal = false;

		this.pendingRenderRAF = null;

		this.initEvents();
	}

	makePipelines(effects) {
		const passes = [];
		effects.forEach((e) => { passes.push(e.createPass(this.gl, this.vs)); });
		this.fullResPipeline = new ShaderPipeline(this.gl, this.quadBuffer, this.vao, passes);
		this.previewPipeline =  new ShaderPipeline(this.gl, this.quadBuffer, this.vao, passes);
	}

	setImage(image) {
		if (!this.fullResPipeline) return;

		this.originalWidth = image.width;
		this.originalHeight = image.height;

		const gl = this.gl;

	    gl.bindTexture(gl.TEXTURE_2D, this.originalImageTexture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
		this.hasImage = true;

		if (this.previewMaxSize) { 
			const scale = Math.min(1, this.previewMaxSize / Math.max(image.width, image.height));

			const resized = document.createElement("canvas");
			const ctx = resized.getContext("2d");
			resized.width = Math.round(image.width * scale);
			resized.height = Math.round(image.height * scale);
			ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, resized.width, resized.height);
			this.previewPipeline.setImage(resized);
			this.showPreview = true;
		}

		this.fullResPipeline.setImage(image);
	}

	present() {
		if (!this.displayTexture && !(this.showOriginal && this.hasImage)) return;

		const gl = this.gl;
		let source = this.showOriginal ? this.originalImageTexture : this.displayTexture;

	    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
	    gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.scissor(0, 0, this.canvas.width, this.canvas.height);

        gl.useProgram(this.displayProgram);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, source);
        gl.uniform1i(this.u_image, 0);
        gl.uniform1f(this.u_scale, this.scale);
        gl.uniform2f(this.u_offset, this.offsetX, this.offsetY);
        gl.uniform2f(this.u_canvasSize, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.u_imageSize, this.originalWidth, this.originalHeight);

        gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	render() {
		if (!this.hasImage) return;

		// Cancel previously started renders
		if (this.pendingRenderRAF) {
			cancelAnimationFrame(this.pendingRenderRAF);
			this.pendingRenderRAF = null;
		}

		if (this.showPreview) {
			this.previewPipeline.beginRender(
				this.previewPipeline.width,
    			this.previewPipeline.height
    		);
			this.displayTexture = this.previewPipeline.renderSome(0);
			this.present();
		}

		this.fullResPipeline.beginRender(512, 512);
		const renderFrame = () => {
		    const res = this.fullResPipeline.renderSome(16);

		    if (res) {
		        this.displayTexture = res;
		        this.present();
		    }
			else {
		        this.pendingRenderRAF = requestAnimationFrame(renderFrame);
		    }
		};

		this.pendingRenderRAF = requestAnimationFrame(renderFrame);
	}

	export() {
		if (!this.hasImage) return;
		this.fullResPipeline.beginRender(512);
		return this.fullResPipeline.renderSome(0);
	}

	resetTransform() {
		if (!this.originalWidth || !this.originalHeight) return
		
		this.scale = Math.min(
			this.canvas.width / this.originalWidth,
			this.canvas.height / this.originalHeight
		);

		this.offsetX = (this.canvas.width - this.originalWidth * this.scale) / 2
		this.offsetY = (this.canvas.height - this.originalHeight * this.scale) / 2
		this.present();
	}

	getMaxTextureSize() {
    	const gl = this.gl;
    	return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }

	initEvents() {
        this.canvas.onwheel = (e) => {
            e.preventDefault();

            const zoom = e.deltaY < 0 ? 1.1 : 0.9;

            const mx = e.offsetX;
            const my = e.offsetY;

            this.offsetX = mx - (mx - this.offsetX) * zoom;
            this.offsetY = my - (my - this.offsetY) * zoom;

            this.scale *= zoom;

            this.present();
        };

        this.canvas.addEventListener("mousedown", (e) => {
            this.dragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        window.addEventListener("mouseup", () => {
            this.dragging = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (!this.dragging) return;
            if (e.buttons === 0) return;

            this.offsetX += e.clientX - this.lastX;
            this.offsetY += e.clientY - this.lastY;

            this.lastX = e.clientX;
            this.lastY = e.clientY;

            this.present();
        });

        window.addEventListener("resize", () => {
		    this.canvas.width = this.canvas.clientWidth;
		    this.canvas.height = this.canvas.clientHeight;

		    this.resetTransform();
		    this.present();
		});
    }
}

class ShaderPipeline {
	constructor(gl, quadBuffer, vao, passes) {
		this.gl = gl;
		this.quadBuffer = quadBuffer;
		this.vao = vao;
		this.passes = passes;

		this.inputTexture = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	    this.buffers = [
	    	this.createRenderTarget(),
	    	this.createRenderTarget()
	    ]
	}

	setImage(image, maxSize = null) {
		const gl = this.gl;

		// Copy the image to the input texture
		gl.bindTexture(gl.TEXTURE_2D, this.inputTexture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

	    // Resize the render targets
		for (const target of this.buffers) {
			gl.bindTexture(gl.TEXTURE_2D, target.texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, image.width, image.height,
	    		0, gl.RGBA, gl.HALF_FLOAT, null
			);
		}

		this.height = image.height;
		this.width = image.width;
	}

	beginRender(tileWidth, tileHeight) {
		this.tileWidth = tileWidth > this.width ? this.width : tileWidth;
		this.tileHeight = tileHeight > this.height ? this.height: tileHeight;

		this.currentPassIdx = 0;
		this.activePasses = this.passes.filter(
	        (pass) => pass.effect.enabled
	    );

		this.currentTileX = 0;
		this.currentTileY = 0;
		this.readBuffer = this.buffers[0];
		this.writeBuffer = this.buffers[1];
		this.currentTexture = this.inputTexture;
		this.gl.viewport(0, 0, this.width, this.height);
	}

	renderSome(frameBudgetMs = 0) {
		const startTime = performance.now();

		while (true) {
			if (frameBudgetMs > 0 && performance.now() - startTime > frameBudgetMs) {
				return null;
			}

			console.log(this.currentPassIdx, this.currentTileX, this.currentTileY, performance.now() - startTime);

			const tileWidth = Math.min(this.tileWidth, this.width - this.currentTileX);
			const tileHeight = Math.min(this.tileHeight, this.height - this.currentTileY);
	        this.renderTile(
	        	this.currentTexture, this.writeBuffer.framebuffer, 
	        	this.currentTileX, this.currentTileY,
	        	tileWidth, tileHeight, this.activePasses[this.currentPassIdx]
	        );
	        
	        // Advance tile position
	        this.currentTileX += tileWidth;
	        if (this.currentTileX >= this.width) {
	            this.currentTileX = 0;
	            this.currentTileY += tileHeight;
	        }

	        // Advance pass
	        if (this.currentTileY >= this.height) {
	            this.currentTileY = 0;
	            this.currentPassIdx++;
				[this.readBuffer, this.writeBuffer] = [this.writeBuffer, this.readBuffer]
	            this.currentTexture = this.readBuffer.texture;
	        }  

	    	// Rendering complete
	        if (this.currentPassIdx >= this.activePasses.length) {
	            return this.currentTexture;
	        }
    	}
	}

	renderTile(sourceTexture, writeBuf, x, y, width, height, pass) {
		const gl = this.gl;
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, writeBuf);
	    this.gl.scissor(x, y, width, height);

		gl.bindVertexArray(this.vao);
        pass.bind(sourceTexture);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.clientWaitSync(sync, 0, 0);
	}

	createRenderTarget() {
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

void main() { 
	vec2 screenPx = vec2(
	    v_uv.x * u_canvasSize.x,
	    (1.0 - v_uv.y) * u_canvasSize.y
	);
	vec2 imagePx = (screenPx - u_offset) / u_scale; 
	vec2 uv = imagePx / u_imageSize; 

	if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { 
		fragColor = vec4(0.0); return; 
	} 

	fragColor = texture(u_image, uv);
}
`