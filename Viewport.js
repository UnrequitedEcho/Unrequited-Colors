const vsSource = `
attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
    v_uv = (a_pos + 1.0) * 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const fsSource = `
precision highp float; 
varying vec2 v_uv; 
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
		gl_FragColor = vec4(0.0); return; 
	} 

	gl_FragColor = texture2D(u_image, uv);
}
`

export class Viewport {
	constructor(canvas) {
		this.canvas = canvas; // visible canvas
		this.gl = this.canvas.getContext("webgl");
		if (!this.gl) { throw new Error("WebGL not supported"); }
		const gl = this.gl;

		this.quadBuffer = this._initFullscreenQuad();

		const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSource);
        gl.compileShader(vs);

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSource);
        gl.compileShader(fs);

        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.bindAttribLocation(this.program, 0, "a_pos");
        gl.linkProgram(this.program);

        this.u_image = gl.getUniformLocation(this.program, "u_image");
        this.u_scale = gl.getUniformLocation(this.program, "u_scale");
        this.u_offset = gl.getUniformLocation(this.program, "u_offset");
        this.u_canvasSize = gl.getUniformLocation(this.program, "u_canvasSize");
        this.u_imageSize = gl.getUniformLocation(this.program, "u_imageSize");

		this.texture = gl.createTexture();
	    gl.bindTexture(gl.TEXTURE_2D, this.texture);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		this.image = null;

		// View transform
		this.scale = 1;
		this.offsetX = 0;
		this.offsetY = 0;

		// Interaction state
		this.dragging = false;
		this.lastX = 0;
		this.lastY = 0;

		this.canvas.width = this.canvas.clientWidth;
		this.canvas.height = this.canvas.clientHeight;

		this.initEvents();
	}

	setImage(image, width, height) {
		if (!image) return;
		this.image = image;

		this.imageWidth = width;
		this.imageHeight = height;

		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
	    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.image);
	}

	draw() {
		if (!this.image) return;

		const gl = this.gl;

	    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
	    gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        gl.useProgram(this.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.u_image, 0);
        gl.uniform1f(this.u_scale, this.scale);
        gl.uniform2f(this.u_offset, this.offsetX, this.offsetY);
        gl.uniform2f(this.u_canvasSize, this.canvas.width, this.canvas.height);
        gl.uniform2f(this.u_imageSize, this.imageWidth, this.imageHeight);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
	}

	resetTransform(width = null, height = null) {
		if (width && height) {
			this.imageWidth = width;
    		this.imageHeight = height;
		}

		if (!this.imageWidth || !this.imageHeight) return;		
		
		this.scale = Math.min(
			this.canvas.width / this.imageWidth,
			this.canvas.height / this.imageHeight
		);

		this.offsetX = (this.canvas.width - this.imageWidth * this.scale) / 2
		this.offsetY = (this.canvas.height - this.imageHeight * this.scale) / 2
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

            this.draw();
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

            this.draw();
        });

        window.addEventListener("resize", () => {
		    this.canvas.width = this.canvas.clientWidth;
		    this.canvas.height = this.canvas.clientHeight;

		    this.resetTransform();
		    this.draw();
		});
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