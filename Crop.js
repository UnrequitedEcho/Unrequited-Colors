export class Crop {
	constructor(onChange) {
		this.onChange = () => {
			this.clampToImageBounds();
			onChange(this.cropEnabled, this.cropCenter, this.cropSize, this.cropRotation);
		}
		this.cropEnabled = false;
		this.cropCenter = {x: 0, y: 0};
		this.cropSize = {width: 0, height: 0};
		this.cropRotation = 0;
		this.cropRatio = {width: 0, height: 0};
	}

	onMouseDown(imagePos) {
		this.u_cropCenter = imagePos;
		this.onChange();
		return true;
	}

	onWheel(deltaY) {
		const zoom = deltaY < 0 ? 1.1 : 0.9;
		this.cropSize.width *= zoom;
		this.cropSize.height *= zoom;
		this.onChange();
		return true;
	}

	clampToImageBounds() {

	}

	createUI(root) {
		const radioRow = document.createElement("div");

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
	        	if (ratio.id === "custom") {
	        		customRatioContainer.style.display = "flex";
	        	}
	        	else { 
	        		customRatioContainer.style.display = "none";
	        		[this.cropRatio.width, this.cropRatio.height] = ratio.id.split(":").map(Number);
	        	}

				this.onChange();
	        };

	        const text = document.createElement("span");
	        text.textContent = ratio.label;

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
	    widthInput.value = this.cropRatio.width;

	    const separator = document.createElement("span");
	    separator.textContent = ":";

	    const heightInput = document.createElement("input");
	    heightInput.type = "number";
	    heightInput.min = 1;
	    heightInput.value = this.cropRatio.height;

	    widthInput.oninput = () => {
	        this.cropRatio.width = Number(widthInput.value);
			this.onChange();
	    };

	    heightInput.oninput = () => {
	        this.cropRatio.height = Number(heightInput.value);
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
	    input.value = this.cropRotation;

	    input.oninput = () => {
	        this.cropRotation = Number(input.value);
	        onChange();
	    };

	    angle.appendChild(label);
	    angle.appendChild(input);

	    root.appendChild(angle);
	}
}
