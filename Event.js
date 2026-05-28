export class EventHandler {
	constructor(canvas, displayView, crop) {
		this.canvas = canvas;
		this.crop = crop;
		this.canvasRect = this.canvas.getBoundingClientRect();
		this.displayView = displayView;
		this.editingCrop = false;
		this.dragging = false;
		this.lastPos = {x: 0, y: 0}

		this.initEvents();
	}

	initEvents() {
		const dv = this.displayView;

        this.canvas.onwheel = (e) => {
            e.preventDefault();

            const zoom = e.deltaY < 0 ? 1.1 : 0.9;

            if (this.editingCrop) {
			    this.crop.scale *= zoom;
			    this.crop.onChange();
			}
			else {
				const mx = e.offsetX;
	            const my = e.offsetY;

	            dv.offset.x = mx - (mx - dv.offset.x) * zoom;
	            dv.offset.y = my - (my - dv.offset.y) * zoom;

	            dv.scale *= zoom;
			}

            dv.present();
        };

        this.canvas.addEventListener("mousedown", (e) => {
        	if (this.editingCrop) {
        		this.crop.center = dv.canvasToImage({x: e.offsetX, y: e.offsetY});
        		this.crop.onChange();
        	}

        	else {
        		this.dragging = true;
            	this.lastPos = this.getCanvasPos(e);
        	}
        });

        window.addEventListener("mouseup", () => {
            this.dragging = false;
        });

        window.addEventListener("mousemove", (e) => {
            if (e.buttons === 0) return;

            const canvasPos = this.getCanvasPos(e);

            if (this.editingCrop) {
        		this.crop.center = dv.canvasToImage(canvasPos);
        		this.crop.onChange();
        	}

        	if (this.dragging) {
        		dv.offset.x += canvasPos.x - this.lastPos.x;
	            dv.offset.y += canvasPos.y - this.lastPos.y;

	            this.lastPos = canvasPos;
	            dv.present();
        	}
        });

        window.addEventListener("resize", () => {
		    this.canvas.width = this.canvas.clientWidth;
		    this.canvas.height = this.canvas.clientHeight;
		    this.canvasRect = this.canvas.getBoundingClientRect();

		    dv.resetTransform();
		    dv.present();
		});

		window.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.editingCrop) {
				this.editingCrop = false;
			}
		})
    }

    getCanvasPos(e) {
	    return {
	        x: (e.clientX - this.canvasRect.left) * (this.canvas.width / this.canvasRect.width),
	        y: (e.clientY - this.canvasRect.top) * (this.canvas.height / this.canvasRect.height)
	    };
	}
}
