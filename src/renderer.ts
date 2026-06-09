import { get } from 'svelte/store'
import * as State from './state'
import { getUniformLocation, imageToCanvas } from './utils'
import type { Effect } from './effects';

interface EffectCache {
	hash: string | null;
	renderTarget: RenderTarget | null;
}

interface Program {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation>;
}

interface RenderTarget {
	texture: WebGLTexture; 
	framebuffer: WebGLFramebuffer;
}

interface RenderState {
	pendingRenderRAF: number | null;
	tileWidth: number;
	tileHeight: number;
	tileX: number;
	tileY: number;
	effectId: number;
	effects: Effect[];
	texture: WebGLTexture;
	readTarget: RenderTarget;
	writeTarget: RenderTarget;
}

export class Renderer {
    gl!: WebGL2RenderingContext;
	canvas!: HTMLCanvasElement;
    vao!: WebGLVertexArrayObject;
    copyProgram!: Program;
    previewProgram!: Program;
    exportProgram!: Program;
    sourceImageTexture!: WebGLTexture;
    afterRenderTarget!: RenderTarget;
    exportTarget!: RenderTarget;
    renderTargetA!: RenderTarget;
    renderTargetB!: RenderTarget;
    tileSize!: number;
    effectsCache!: WeakMap<Effect, EffectCache>;
	effects: Effect[];
    renderState: RenderState | null = null;
    imageWidth: number | null = null;
    imageHeight: number | null = null;

	constructor(effects: Effect[]) {
		State.previewState.subscribe(() => this._present() );
        State.cropState.subscribe(   () => this._present() );
        State.effectsState.subscribe(() => this._render()  );
        State.sourceImage.subscribe( () => this._setImage());

        this.effects = effects;
	}

	attachCanvas(canvas: HTMLCanvasElement) {
		// Setup GL
		this.canvas = canvas;
		const ctx = this.canvas.getContext("webgl2");
		if (!ctx) throw new Error("WebGL not supported");
		else this.gl = ctx; 
		const extColorBufferFloat = this.gl.getExtension("EXT_color_buffer_float");
		if (!extColorBufferFloat) throw new Error("EXT_color_buffer_float not supported");
		const gl = this.gl;
		gl.disable(gl.DITHER);

		// Setup Fullscreen Quad
		const quadBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
		const quadBufferDataArray = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadBufferDataArray), gl.STATIC_DRAW);
		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		// Setup Shaders and Programs
		const vs = gl.createShader(gl.VERTEX_SHADER);
		if (!vs) throw new Error("Effect: Could not create a vertex shader");
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);

		// -- copy program
        this.copyProgram = {
        	program: this._createProgram(copyFsSource, vs), 
        	uniforms: {}
        }
        gl.useProgram(this.copyProgram.program);
        this.copyProgram.uniforms = { "u_image" : getUniformLocation(gl, this.copyProgram.program, "u_image") };

        // -- preview program
        this.previewProgram = {
        	program: this._createProgram(previewFsSource, vs),
        	uniforms: {}
        }
        gl.useProgram(this.previewProgram.program);
        this.previewProgram.uniforms = {
        	"u_image" : getUniformLocation(gl, this.previewProgram.program, "u_image"),
	        "u_scale" : getUniformLocation(gl, this.previewProgram.program, "u_scale"),
	        "u_offset" : getUniformLocation(gl, this.previewProgram.program, "u_offset"),
	        "u_canvasSize" : getUniformLocation(gl, this.previewProgram.program, "u_canvasSize"),
	        "u_imageSize" : getUniformLocation(gl, this.previewProgram.program, "u_imageSize"),
	        "u_cropMode" : getUniformLocation(gl, this.previewProgram.program, "u_cropMode"),
	        "u_cropCenter" : getUniformLocation(gl, this.previewProgram.program, "u_cropCenter"),
	        "u_cropHalfSize" : getUniformLocation(gl, this.previewProgram.program, "u_cropHalfSize"),
	        "u_cropRotation" : getUniformLocation(gl, this.previewProgram.program, "u_cropRotation")
        }

        // -- export program
        this.exportProgram = {
        	program: this._createProgram(exportFsSource, vs),
        	uniforms: {}
        }
        gl.useProgram(this.exportProgram.program);
        this.exportProgram.uniforms = {
        	"u_image" : getUniformLocation(gl, this.exportProgram.program, "u_image"),
        	"u_imageSize" : getUniformLocation(gl, this.exportProgram.program, "u_imageSize"),
	        "u_cropCenter" : getUniformLocation(gl, this.exportProgram.program, "u_cropCenter"),
	        "u_cropHalfSize" : getUniformLocation(gl, this.exportProgram.program, "u_cropHalfSize"),
	        "u_cropRotation" : getUniformLocation(gl, this.exportProgram.program, "u_cropRotation")
        }

        // -- effects programs
        for (const effect of this.effects) {
        	effect.makeProgram(gl, vs);
        }

        // Setup Textures and Ping Pong Render Targets
        this.sourceImageTexture = this._createTexture();
		this.afterRenderTarget = this._createRenderTarget(gl.LINEAR);
		this.renderTargetA = this._createRenderTarget();
		this.renderTargetB = this._createRenderTarget();
		this.exportTarget = this._createRenderTarget(gl.LINEAR);
		gl.activeTexture(gl.TEXTURE0);

		this.effectsCache = new WeakMap();
		for (const effect of this.effects) {
			const renderTarget = effect.requestCache ? this._createRenderTarget() : null;
			this.effectsCache.set(effect, {hash: null, renderTarget});
		}

		this.tileSize = this.getMaxTextureSize() / 8;

		// Black background
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	getMaxTextureSize() {
    	return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
    }

    async export() {
    	if (!this.gl || !this.imageWidth || !this.imageHeight) return;
    	const gl = this.gl;

    	const cropState = get(State.cropState);
		const rot = cropState.enabled ? cropState.rotation * Math.PI / 180 : 0;
		const width = Math.floor(cropState.enabled ? cropState.aspectRatio * cropState.height : this.imageWidth);
		const height = Math.floor(cropState.enabled ? cropState.height : this.imageHeight);

		// Wait for the possible render pending to finish
		await (async () => {  
			while (this.renderState) {
	        	await new Promise(requestAnimationFrame);
	    	}
	    })();

		gl.bindFramebuffer(gl.FRAMEBUFFER, this.exportTarget.framebuffer);
		gl.bindTexture(gl.TEXTURE_2D, this.exportTarget.texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(0, 0, width, height);
		gl.viewport(0, 0, width, height);
    	gl.bindTexture(gl.TEXTURE_2D, this.afterRenderTarget.texture);
		gl.useProgram(this.exportProgram.program);
		gl.uniform1i(this.exportProgram.uniforms.u_image, 0);
        gl.uniform2f(this.exportProgram.uniforms.u_imageSize, this.imageWidth, this.imageHeight);
        gl.uniform2f(this.exportProgram.uniforms.u_cropCenter, cropState.centerX, cropState.centerY);
        gl.uniform2f(this.exportProgram.uniforms.u_cropHalfSize, width / 2, height / 2);
        gl.uniform1f(this.exportProgram.uniforms.u_cropRotation, rot);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

		const pixels = new Uint8Array(width * height * 4);
		gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		const exportCanvas = new OffscreenCanvas(width, height);
        const exportCtx = exportCanvas.getContext("2d");
        if (!exportCtx) throw new Error("Renderer: Could not create an export context");
        const imageData = exportCtx.createImageData(width, height);
        imageData.data.set(pixels);
        exportCtx.putImageData(imageData, 0, 0);

        return exportCanvas;
	}

    _setImage() {
    	const gl = this.gl;
    	if (!gl) return;
    	const bitmap = get(State.sourceImage)!.bitmap!;
    	this.imageWidth = bitmap.width;
    	this.imageHeight = bitmap.height;
    	const w = bitmap.width;
    	const h = bitmap.height;

    	// Resize Input and Preview Textures
    	gl.bindTexture(gl.TEXTURE_2D, this.sourceImageTexture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, bitmap);
	    gl.bindTexture(gl.TEXTURE_2D, this.afterRenderTarget.texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.UNSIGNED_BYTE, null);

	    // Resize the ping pong textures
	    gl.bindTexture(gl.TEXTURE_2D, this.renderTargetA.texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
	    gl.bindTexture(gl.TEXTURE_2D, this.renderTargetB.texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);

    	// Reset cache and resize cache textures
	    this.effects.forEach((effect) => {
	    	const cache = this.effectsCache.get(effect);
	    	if (!cache) return
	    	cache.hash = "";
	    	if (!cache.renderTarget) return
	    	gl.bindTexture(gl.TEXTURE_2D, cache.renderTarget.texture);
	    	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
	    })

	    this._render();
    }

	_render() {
		if (!this.gl || !this.imageWidth || !this.imageHeight) return;
		const effectsState = get(State.effectsState);

		// Cancel previously started renders
		if (this.renderState?.pendingRenderRAF) {
			cancelAnimationFrame(this.renderState.pendingRenderRAF);
			this.renderState = null;
		}

		// Prepare the RenderState
		this.renderState = {
			pendingRenderRAF: null, 
			tileWidth: this.imageWidth > this.tileSize ? this.tileSize : this.imageWidth, 
			tileHeight: this.imageHeight > this.tileSize ? this.tileSize : this.imageHeight, 
			tileX: 0,
			tileY: 0,
			effectId: 0,
			effects: [],
			texture: this.sourceImageTexture,
			readTarget: this.renderTargetA,
			writeTarget: this.renderTargetB
		}

		// Restart from the first effect that hasn't changed
		let validCache = true;
		for (let i = 0; i < this.effects.length; i++) {
			const effect = this.effects[i];
			const effectState = effect.stateKey ? effectsState[effect.stateKey] : { "enabled": true };
			const hash = effect.constructor.name + ":" + JSON.stringify(effectState);
			const cache = this.effectsCache.get(effect);
			validCache &&= hash === cache?.hash;

			if (effectState.enabled) {
				this.renderState.effects.push(effect);

				if (effect.requestCache && cache?.renderTarget && validCache) {
					this.renderState.effectId = this.renderState.effects.length;
					this.renderState.texture = cache.renderTarget.texture;
				}
			}

			// Save Effect Cache Hashes for later render
			if (cache) cache.hash = hash;
		}

		// Shortcut: if no effects, just copy the input texture
		if (this.renderState.effects.length === 0) {
	    	this._copyTexture(this.sourceImageTexture, this.afterRenderTarget);
	    	this.renderState = null;
	    	this._present();
	    	return;
		}

		// Bind Uniforms
		for (const effect of this.renderState.effects) {
			this.gl.useProgram(effect.program);
			effect.bindUniforms(this.gl, effectsState);
		}

		// Schedule Renders
		let renderTime = 0;
		let frames = 1;
		const renderMore = () => {
			const startTime = performance.now();
		    const finished = this._renderSome(12);
		    renderTime += performance.now() - startTime;

		    if (finished) {
		    	this.renderState = null;
		        console.log(`Rendered in ${renderTime}ms over ${frames} frames`);
		        this._present();
		    }
			else {
		        this.renderState!.pendingRenderRAF = requestAnimationFrame(renderMore);
		        frames++;
		    }
		};
		this.renderState.pendingRenderRAF = requestAnimationFrame(renderMore);
	}

	_renderSome(timeLimitMs = 0) {
		if (!this.gl || !this.imageWidth || !this.imageHeight || !this.renderState) return;
		const startTime = performance.now();
		const gl = this.gl;
		const rstate = this.renderState;
		gl.viewport(0, 0, this.imageWidth, this.imageHeight);
		gl.enable(gl.SCISSOR_TEST);

		while (true) {
			if (timeLimitMs > 0 && performance.now() - startTime > timeLimitMs) {
				return null;
			}

		    // Rendering complete
	        if (rstate.effectId >= rstate.effects.length) {
	        	this._copyTexture(rstate.readTarget.texture, this.afterRenderTarget);
	            return true;
	        }

			const tileWidth = Math.min(rstate.tileWidth, this.imageWidth - rstate.tileX);
			const tileHeight = Math.min(rstate.tileHeight, this.imageHeight - rstate.tileY);
			const effect = rstate.effects[rstate.effectId];

			// Render Tile
			gl.bindFramebuffer(this.gl.FRAMEBUFFER, rstate.writeTarget.framebuffer);
			gl.scissor(rstate.tileX, rstate.tileY, tileWidth, tileHeight);
			gl.bindVertexArray(this.vao);
			gl.bindTexture(gl.TEXTURE_2D, rstate.texture);
			gl.useProgram(effect.program);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
        	gl.finish();
	        
	        // Advance tile position
	        rstate.tileX += tileWidth;
	        if (rstate.tileX >= this.imageWidth) {
	            rstate.tileX = 0;
	            rstate.tileY += tileHeight;
	        }

	        // Advance effect
	        if (rstate.tileY >= this.imageHeight) {
	            rstate.tileY = 0;
	            rstate.effectId++;
	            rstate.texture = rstate.writeTarget.texture;

	            // Save effect cache
	            if (effect.requestCache) {
	            	const cache = this.effectsCache.get(effect);
	            	if (!cache?.renderTarget) return;
	            	this._copyTexture(rstate.texture, cache.renderTarget);
	            }

				[rstate.readTarget, rstate.writeTarget] = [rstate.writeTarget, rstate.readTarget]
	        }  
    	}
	}

	_present() {
		if (!this.gl) return;
		const gl = this.gl;
		// Black background
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.clearColor(0, 0, 0, 1);
		gl.clear(gl.COLOR_BUFFER_BIT);

		if (!this.imageWidth || !this.imageHeight || this.renderState) return;

		const previewState = get(State.previewState);
		const cropState = get(State.cropState);

		const cropMode = previewState.mode === 'cropEdit' ? 2 : cropState.enabled ? 1 : 0;
		const cropRot = cropState.enabled ? cropState.rotation * Math.PI / 180 : 0;

		// Convert crop stuff to image coordinates
		const cropHalfSize = { 
			width: cropState.aspectRatio * cropState.height / 2 * previewState.scale, 
			height: cropState.height / 2 * previewState.scale 
		};
		const [cropCenterX, cropCenterY] = imageToCanvas(
			cropState.centerX, cropState.centerY,
			this.imageWidth, this.imageHeight,
			previewState.offsetX, previewState.offsetY,
			previewState.scale, cropState.rotation
		);

		gl.disable(gl.SCISSOR_TEST);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, this.afterRenderTarget.texture);
		gl.useProgram(this.previewProgram.program);
		gl.uniform1i(this.previewProgram.uniforms.u_image, 0);
        gl.uniform1f(this.previewProgram.uniforms.u_scale, previewState.scale);
        gl.uniform2f(this.previewProgram.uniforms.u_offset, previewState.offsetX, previewState.offsetY);
        gl.uniform2f(this.previewProgram.uniforms.u_canvasSize, previewState.canvasWidth, previewState.canvasHeight);
        gl.uniform2f(this.previewProgram.uniforms.u_imageSize, this.imageWidth, this.imageHeight);
        gl.uniform1i(this.previewProgram.uniforms.u_cropMode, cropMode);
        gl.uniform2f(this.previewProgram.uniforms.u_cropCenter, cropCenterX, cropCenterY);
        gl.uniform2f(this.previewProgram.uniforms.u_cropHalfSize, cropHalfSize.width, cropHalfSize.height);
        gl.uniform1f(this.previewProgram.uniforms.u_cropRotation, cropRot);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	_copyTexture(source: WebGLTexture, target: RenderTarget) {
		if (!this.gl || !this.imageWidth || !this.imageHeight) return;
		const gl = this.gl;
		gl.disable(gl.SCISSOR_TEST);
		gl.viewport(0, 0, this.imageWidth, this.imageHeight);
		gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
		gl.useProgram(this.copyProgram.program);
		gl.bindTexture(gl.TEXTURE_2D, source);
		gl.uniform1i(this.copyProgram.uniforms.u_image, 0);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	_createProgram(fsSource: string, vs: WebGLShader) {
		const gl = this.gl;

		const fs = gl.createShader(gl.FRAGMENT_SHADER);
		if (!fs) throw new Error("Renderer: Could not create a fragment shader");
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        const program = gl.createProgram();
        if (!program) throw new Error("Renderer: Could not create a program");
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.bindAttribLocation(program, 0, "a_pos");
        gl.linkProgram(program);

        return program;
	}

	_createRenderTarget(filter: number = this.gl.NEAREST) {
		const gl = this.gl;
		const texture = this._createTexture(filter);
		const framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		return {texture, framebuffer};
	}

	_createTexture(filter: number = this.gl.NEAREST) {
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

const copyFsSource = `#version 300 es
precision highp float; 

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image; 

void main() {
	fragColor = texture(u_image, v_uv);
	return;
}
`

const previewFsSource = `#version 300 es
precision highp float; 

in vec2 v_uv; 
out vec4 fragColor;
uniform sampler2D u_image; 
uniform float u_scale; 
uniform vec2 u_offset; 
uniform vec2 u_canvasSize; 
uniform vec2 u_imageSize;
uniform int u_cropMode; // 0: disabled 1: enabled 2: editing
uniform vec2 u_cropCenter; // in iamge coords
uniform vec2 u_cropHalfSize; // in image coords
uniform float u_cropRotation;

void main() { 
	vec2 screenPx = vec2( v_uv.x * u_canvasSize.x, (1.0 - v_uv.y) * u_canvasSize.y ); 
	vec2 imagePx = (screenPx - u_offset) / u_scale;

	// CropBox
	vec2 local = screenPx - u_cropCenter;

	bool insideCrop =
	    abs(local.x) <= u_cropHalfSize.x && abs(local.y) <= u_cropHalfSize.y;

	// Frame
	float frameSize = 3.;
	bool insideOuter =
    	abs(local.x) <= u_cropHalfSize.x + frameSize &&
    	abs(local.y) <= u_cropHalfSize.y + frameSize;

	bool insideInner =
	    abs(local.x) <= u_cropHalfSize.x &&
	    abs(local.y) <= u_cropHalfSize.y;

	if (u_cropMode == 2 && insideOuter && !insideInner) {
		fragColor = vec4(1., 1., 1., 1.);
		return;
	}

	// Rotation
	vec2 imgCenter = u_imageSize * 0.5;
	float s = sin(u_cropRotation);
	float c = cos(u_cropRotation);
	vec2 p = imagePx - imgCenter;
	vec2 rotated = vec2( p.x * c - p.y * s, p.x * s + p.y * c );
	vec2 samplePx = rotated + imgCenter;
	vec2 sampleUV = samplePx / u_imageSize; 

	// Pixels outside the image
	if (sampleUV.x < 0. || sampleUV.x > 1. || sampleUV.y < 0. || sampleUV.y > 1.) { 
		fragColor = vec4(0., 0., 0., 1.0); return; 
	} 
	vec4 color = texture(u_image, sampleUV); 

	// pixels cropped 
	if (!insideCrop) { 
		float factor = 1.; 
		if (u_cropMode == 1) factor = 0.; 
		if (u_cropMode == 2) factor = 0.3; 
		color.rgb *= factor; 
	}
	fragColor = color; 
	return; 
}
`

const exportFsSource = `#version 300 es
precision highp float; 

in vec2 v_uv; 
out vec4 fragColor;
uniform sampler2D u_image;
uniform vec2 u_imageSize;
uniform vec2 u_cropCenter;
uniform vec2 u_cropHalfSize;
uniform float u_cropRotation;

void main() { 
	vec2 cropPx = (v_uv * 2.0 * u_cropHalfSize) - u_cropHalfSize;
	
	vec2 imagePx = cropPx + u_cropCenter;

	// Rotation
	vec2 imgCenter = u_imageSize * 0.5;
	float s = sin(u_cropRotation);
	float c = cos(u_cropRotation);
	vec2 p = imagePx - imgCenter;
	vec2 rotated = vec2( p.x * c - p.y * s, p.x * s + p.y * c );
	vec2 samplePx = rotated + imgCenter;
	vec2 sampleUV = samplePx / u_imageSize; 

	fragColor = texture(u_image, sampleUV); 
	return;
}
`
