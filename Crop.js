export class Crop {
	constructor(onChange, onEdit) {
		this.onChange = () => {
			this.clampToImageBounds();
			const size = { width: this.ratio.width * this.scale, height: this.ratio.height * this.scale };
			onChange(this.enabled, this.center, size, this.rotation);
		}
		this.onEdit = onEdit;
		this.enabled = false;
		this.scale = 1;
		this.center = {x: 0, y: 0};
		this.rotation = 0;
		this.ratio = {width: 16, height: 9};
		this.imageSize = {width: 0, height: 0};
	}

	setImage(size) {
		this.imageSize = size;
		this.center = { x: Math.round(size.width / 2), y: Math.round(size.height / 2) };
		this.scale = size.width / this.ratio.width;
		if (this.enabled) this.onChange;
	}

	clampToImageBounds() {
		const rw = this.ratio.width;
		const rh = this.ratio.height;

		const angle = this.rotation;

		const cos = Math.abs(Math.cos(angle));
		const sin = Math.abs(Math.sin(angle));

		const imageW = this.imageSize.width;
		const imageH = this.imageSize.height;

		// Current crop dimensions
		let w = rw * this.scale;
		let h = rh * this.scale;

		// Rotated AABB half extents
		let halfW = (w * cos + h * sin) / 2;
		let halfH = (w * sin + h * cos) / 2;

		// If crop cannot possibly fit, shrink scale
		const maxScaleX = imageW / (rw * cos + rh * sin);
		const maxScaleY = imageH / (rw * sin + rh * cos);

		const maxScale = Math.min(maxScaleX, maxScaleY);

		if (this.scale > maxScale) {
			this.scale = maxScale;

			w = rw * this.scale;
			h = rh * this.scale;

			halfW = (w * cos + h * sin) / 2;
			halfH = (w * sin + h * cos) / 2;
		}

		// Clamp center
		this.center.x = Math.max(
			halfW,
			Math.min(imageW - halfW, this.center.x)
		);

		this.center.y = Math.max(
			halfH,
			Math.min(imageH - halfH, this.center.y)
		);
	}

	createUI(root) {
		const radioRow = document.createElement("div");

		const editBtn = document.createElement("button");
		editBtn.textContent = "Edit Crop";
		editBtn.onclick = this.onEdit;
		root.appendChild(editBtn);

		// Radio Button Row
		const aspectRatios = ['16:9', '4:3', '21:9', 'Custom'];
		for (const ratio of aspectRatios) {
	        const label = document.createElement("label");
	        label.className = "crop-radio";

	        const input = document.createElement("input");
	        input.type = "radio";
	        input.name = "crop-aspect";
	        input.value = ratio;
	        input.checked = ratio === '16:9';

	        input.onchange = () => {
	        	if (ratio === "Custom") {
	        		customRatioContainer.style.display = "flex";
	        	}
	        	else { 
	        		customRatioContainer.style.display = "none";
	        		[this.ratio.width, this.ratio.height] = ratio.split(":").map(Number);
	        	}

				this.onChange();
	        };

	        const text = document.createElement("span");
	        text.textContent = ratio;

	        label.appendChild(input);
	        label.appendChild(text);

	        radioRow.appendChild(label);
	    }

	    root.appendChild(radioRow);

	    // Custom Ratio Row
	    const customRatioContainer = document.createElement("div");
	    customRatioContainer.className = "crop-custom";
	    customRatioContainer.style.display = "none";

	    const widthInput = document.createElement("input");
	    widthInput.type = "number";
	    widthInput.min = 1;
	    widthInput.value = this.ratio.width;

	    const separator = document.createElement("span");
	    separator.textContent = ":";

	    const heightInput = document.createElement("input");
	    heightInput.type = "number";
	    heightInput.min = 1;
	    heightInput.value = this.ratio.height;

	    widthInput.oninput = () => {
	        this.ratio.width = Number(widthInput.value);
			this.onChange();
	    };

	    heightInput.oninput = () => {
	        this.ratio.height = Number(heightInput.value);
			this.onChange();
	    };

	    customRatioContainer.appendChild(widthInput);
	    customRatioContainer.appendChild(separator);
	    customRatioContainer.appendChild(heightInput);

	    root.appendChild(customRatioContainer);

	    // Angle row
	    const angle = document.createElement("div");
	    angle.className = "crop-angle";

	    const label = document.createElement("label");
	    label.textContent = "Angle";

	    const input = document.createElement("input");
	    input.type = "number";
	    input.min = -45;
	    input.max = 45;
	    input.step = 0.1;
	    input.value = this.rotation;

	    input.oninput = () => {
	        this.rotation = Number(input.value) * Math.PI / 180;
	        this.onChange();
	    };

	    angle.appendChild(label);
	    angle.appendChild(input);

	    root.appendChild(angle);
	}
}
