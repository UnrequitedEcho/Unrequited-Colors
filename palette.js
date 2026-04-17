export class Palette {
    constructor(onChange) {
        this.colors = [];
        this.onChange = onChange;
        this.preset = null;
    }

    set(colors, { preset = null } = {}) {
        this.colors = [...colors];
        this.preset = preset;
        this._emit();
    }

    _emit() {
        if (this.onChange) this.onChange(this.colors);
    }
}

export function renderPalette(container, palette, onChange) {
    container.innerHTML = "";

    // reuse a single hidden color input
    let colorInput = container._colorInput;
    if (!colorInput) {
        colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.style.position = "absolute";
        colorInput.style.visibility = "hidden";
        container._colorInput = colorInput;
        container.appendChild(colorInput);
    }

    // append a swatch for each color
    palette.forEach((color, index) => {
        const div = document.createElement("div");
        div.className = "swatch";
        div.style.background = color;

        div.onclick = () => {
            colorInput.value = color;

            colorInput.oninput = (e) => {
                const newColors = [...palette];
                newColors[index] = e.target.value;
                onChange(newColors);
            };

            colorInput.click();
        };

        div.oncontextmenu = (e) => {
            e.preventDefault();

            const newColors = palette.filter((_, i) => i !== index);
            onChange(newColors);
        };

        container.appendChild(div);
    });

    // append the plus button
    if (palette.length < 32) {
        const div = document.createElement("div");
        div.className = "swatch add";
        div.textContent = "+";

        div.onclick = () => {
            colorInput.oninput = (e) => {
                const newColors = [...palette];
                newColors.push(e.target.value);
                onChange(newColors);
            };

            colorInput.click();
        };

        container.appendChild(div);
    }
}