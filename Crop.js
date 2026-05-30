export class Crop {
	constructor(onChange, onStartEdit, onStopEdit) {
		this.onChange = () => {
			this.clampToImageBounds();
			const size = { width: this.ratio.width * this.scale, height: this.ratio.height * this.scale };
			this.sizeSpan.textContent = `${Math.round(size.width)}x${Math.round(size.height)}`;
			onChange(this.enabled, this.center, size, this.rotation);
		}
		this.onStartEdit = onStartEdit;
		this.onStopEdit = onStopEdit;
		this.editing = false;
		this.enabled = false;
		this.scale = 1;
		this.center = {x: 0, y: 0};
		this.rotation = 0;
		this.ratio = {width: 16, height: 9};
		this.imageSize = {width: 0, height: 0};
	}

	setImage(size) {
		this.imageSize = size;
		this.ratio = size;
		this.center = { x: Math.round(size.width / 2), y: Math.round(size.height / 2) };
		this.scale = size.width / this.ratio.width;
		this.onChange();
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

	setRatio(ratio) {
		this.ratio = ratio;
		const scaleX = this.imageSize.width / this.ratio.width;
		const scaleY = this.imageSize.height / this.ratio.height;
		this.scale = Math.min(scaleX, scaleY);
		this.onChange();
	}

	createUI(root) {

		this.editBtn = document.createElement("button");
		this.editBtn.textContent = "Edit Crop";

		const onEscape = (e) => {
			if (e.key === "Escape") {
				window.removeEventListener('keydown', onEscape);
				this.editBtn.classList.remove("active");
				this.onStopEdit();
			}
		}
		this.editBtn.onclick = () => {
			if (!this.editing) {
				this.editBtn.classList.add("active");
				window.addEventListener('keydown', onEscape);
				this.onStartEdit();
			}
			else {
				this.editBtn.classList.remove("active");
				this.onStopEdit();
			}
			this.editing = !this.editing;
		};
		root.appendChild(this.editBtn);

		// Radio Button Row
		const radioRow = document.createElement("div");
		radioRow.id = "radio-row";
		const aspectRatios = ['Original', '16:9', '4:3', '21:9', 'Custom'];
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
	        	else if (ratio === "Original"){
	        		this.setRatio(this.imageSize);
	        	}
	        	else { 
	        		customRatioContainer.style.display = "none";
	        		const newRatio = ratio.split(":").map(Number);
	        		this.setRatio({width: newRatio[0], height: newRatio[1]});
	        	}
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
	    customRatioContainer.id = "crop-custom";
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
	    	this.setRatio({width: Number(widthInput.value), height: this.ratio.height});
	    };

	    heightInput.oninput = () => {
	    	this.setRatio({width: this.ratio.width, height: Number(heightInput.value)})
	    };

	    customRatioContainer.appendChild(widthInput);
	    customRatioContainer.appendChild(separator);
	    customRatioContainer.appendChild(heightInput);

	    root.appendChild(customRatioContainer);

	    // Angle row
	    const angleSliderGroup = document.createElement("div");
		angleSliderGroup.className = "slider-group";

        // Header Row: label and value
        const headerRow = document.createElement("div");
        headerRow.className = "slider-headerRow";
        const labelEl = document.createElement("label");
        labelEl.textContent = "Angle";
        headerRow.appendChild(labelEl);
        const valueEl = document.createElement("span");
        valueEl.textContent = 0;
        headerRow.appendChild(valueEl);

        // SliderRow: slider resetbtn
        const sliderRow = document.createElement("div");
        sliderRow.className = "slider-sliderRow";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.className = "slider";
        slider.min = -45;
        slider.max = 45;
        slider.step = 0.1;
        slider.value = 0;
        sliderRow.appendChild(slider);
        const resetBtn = document.createElement("button");
        resetBtn.className = "slider-reset";
        resetBtn.textContent = "⟲";
        sliderRow.appendChild(resetBtn);

        // Events
        slider.oninput = () => {
            valueEl.textContent = Number(slider.value).toFixed(1);
            this.rotation = slider.value * Math.PI / 180;
            this.onChange();
        }

        resetBtn.onclick = () => {
            slider.value = 0;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        };

        sliderRow.onwheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.1 : -0.1;
            slider.value = +slider.value + delta;
            slider.oninput();
        }

        angleSliderGroup.appendChild(headerRow);
        angleSliderGroup.appendChild(sliderRow);
        root.appendChild(angleSliderGroup);

        const sizeRow = document.createElement("div");
        sizeRow.id = "size-row";
        const sizeLabel = document.createElement("label");
        sizeLabel.textContent = "Final Size :";
        sizeRow.appendChild(sizeLabel);
	    this.sizeSpan = document.createElement("span");
	    sizeRow.appendChild(this.sizeSpan);
	    root.appendChild(sizeRow);
	}
}
