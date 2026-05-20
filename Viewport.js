export class Viewport {
	constructor(canvas) {
		this.canvas = canvas; // visible canvas
		this.ctx = canvas.getContext("2d");

		this.originalCanvas = document.createElement("canvas");
		this.originalCtx = this.originalCanvas.getContext("2d");
		this.processedImage = null;

		this.viewMode = "processed" // "original" | "processed"

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

	setOriginalImage(image) {
		this.originalCanvas.width = image.width;
		this.originalCanvas.height = image.height;
		this.originalCtx.clearRect(
			0, 0, image.width, image.height
		);
		this.originalCtx.drawImage(image, 0, 0);
		this.resetTransform();
		this.draw();
	}

	setProcessedImage(image) {
		this.processedImage = image;
		this.draw();
	}

	setViewMode(viewMode) {
		this.viewMode = viewMode;
		this.draw();
	}

	draw() {
		const image = this.viewMode === "original" ? this.originalImage : this.processedImage;
		if (!image) return;

		this.ctx.clearRect(
			0, 0, this.canvas.width, this.canvas.height
		);

		this.ctx.drawImage(
			image, this.offsetX, this.offsetY, image.width * this.scale, image.height * this.scale
		);
	}

	resetTransform() {
		const image = this.viewMode === "original" ? this.originalImage : this.processedImage;
		if (!image) return;

		this.scale = Math.min(
			this.canvas.width / image.width,
			this.canvas.height / image.height
		);

		this.offsetX = (this.canvas.width - image.width * this.scale) / 2
		this.offsetY = (this.canvas.height - image.height * this.scale) / 2
	}

	screenToImage(x, y) {
		return {
			x: (x - this.offsetX) / this.scale,
			y: (y - this.offsetXY) / this.scale
		}
	}

	sample(x, y, original = true) {
		const image = original ? this.originalImage : this.processedImage;
		if (!image) return;
		const imgCoords = this.screenToImage(x, y);
		const pixel = image.getImageData(
			Math.floor(imgCoords.x), Math.floor(imgCoords.y), 1, 1
		).data;

		return ("#" + pixel.slice(0, 3).map(v => v.toString(16).padStart(2, "0")).join(""));
	}
	
    initEvents() {
        this.canvas.onwheel = (e) => {
            e.preventDefault();

            const zoom = e.deltaY < 0 ? 1.1 : 0.9;

            const mx = e.offsetX;
            const my = e.offsetY;

            this.offsetX =
                mx - (mx - this.offsetX) * zoom;

            this.offsetY =
                my - (my - this.offsetY) * zoom;

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
        	console.log("resize");
		    this.canvas.width = this.canvas.clientWidth;
		    this.canvas.height = this.canvas.clientHeight;

		    this.resetTransform();
		    this.draw();
		});
    }
}