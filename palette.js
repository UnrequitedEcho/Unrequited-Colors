export class Palette {
    constructor(onChange) {
        this.colors = [];
        this.onChange = onChange;
        this.preset = null;
    }

    set(colors, { preset = null } = {}) {
        this.colors = colors.map(c =>
        typeof c === "string"
            ? { color: c, disabled: false }
            : { color: c.color, disabled: !!c.disabled }
        );
        this.preset = preset;
        this._emit();
    }

    getActiveColors() {
        return this.colors
            .filter(c => !c.disabled)
            .map(c => c.color);
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
    palette.forEach((c, index) => {
        const div = document.createElement("div");
        div.className = "swatch";
        div.style.background = c.color;

        if (c.disabled) {
            div.classList.add("disabled");
        }

        div.onmousedown = (e) => {
            e.preventDefault();

            // LEFT CLICK -> edit
            if (e.button === 0) {
                colorInput.value = c.color;

                colorInput.oninput = (ev) => {
                    const newColors = [...palette];
                    newColors[index] = { ...c, color: ev.target.value };
                    onChange(newColors);
                };

                colorInput.click();
            }

            // MIDDLE CLICK -> toggle disabled
            else if (e.button === 1) {
                const newColors = palette.map((col, i) =>
                    i === index
                        ? { ...col, disabled: !col.disabled }
                        : col
                );

                onChange(newColors);
            }
        };

        // RIGHT CLICK -> remove
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