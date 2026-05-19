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
        this.renderPalette();
        this.emit();
    }

    updateColor(index, color) {
        this.colors[index] = 
            typeof color === "string"
                ? { color: color, disabled: false }
                : { color: color.color, disabled: !!color.disabled }
        this.preset = null;
        this.renderPalette();
        this.emit();
    }

    toggleColor(index) {
        const state = this.colors[index].disabled;
        this.colors[index].disabled = !state;
        this.renderPalette();
        this.emit();
    }

    removeColor(index) {
        this.colors.splice(index, 1);
        this.renderPalette();
        this.emit();
    }

    getActiveColors() {
        return this.colors
            .filter(c => !c.disabled)
            .map(c => c.color);
    }

    emit() {
        if (this.onChange) this.onChange(this.getActiveColors());
    }

    createUI(root, presets) {
        this.root = root;
        this.presets = presets;
        
        const openPaletteBtn = document.createElement("button");
        root.appendChild(openPaletteBtn);

        this.presetSelect = document.createElement("select");
        root.appendChild(this.presetSelect);

        this.paletteDisp = document.createElement("div");
        this.paletteDisp.id = "paletteDisp";
        root.appendChild(this.paletteDisp);

        // Load custom palette from file button
        openPaletteBtn.textContent = "Load Custom Palette from File";
        openPaletteBtn.onclick = () => { 
            const colors = this.readCustomPaletteFile() 
            if (!colors.length) {
                alert("No valid colors found.");
                return;
            }
            this.set(colors);
            this.presetSelect.value = "custom";
        }

        // Preset select
        const optCustom = document.createElement("option");
        optCustom.value = "custom";
        optCustom.textContent = "Custom";
        optCustom.disabled = true;
        this.presetSelect.appendChild(optCustom);

        presets.forEach((p, i) => {
            const opt = document.createElement("option");
            opt.value = p.name;
            opt.textContent = p.name;
            this.presetSelect.appendChild(opt);
        });

        this.presetSelect.onchange = () => {
            if (this.presetSelect.value === "custom") return;
            const p = this.presets.find(p => p.name === this.presetSelect.value);
            this.set(p.colors, { preset: p.name });
        };

        if (presets.length > 0) {
            const p = presets[0];
            this.presetSelect.value = p.name;
            this.set(p.colors, { preset: p.name });
        } else {
            this.presetSelect.value = "custom";
        }

        this.renderPalette();
    }

    readCustomPaletteFile() {  
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = false;
        input.hidden = true;

        input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();

            reader.onload = () => {
                const text = reader.result;
                const matches = text.match(/[0-9a-fA-F]{6}/g) || [];
                const seen = new Set();
                const colors = [];

                for (const hex of matches) {
                    const color = "#" + hex.toLowerCase();

                    if (!seen.has(color)) {
                        seen.add(color);
                        colors.push(color);

                        if (colors.length === 32) break;
                    }
                }

                input.remove();
                return colors;
            };
            reader.onerror = () => {
                console.error('read error', reader.error);
                input.remove();
            };
            reader.readAsText(file);
        });

        input.click();
        return [];
    }

    renderPalette() {
        const container = this.paletteDisp;
        container.innerHTML = "";

        // reuse a single hidden color input
        let colorInput = container._colorInput;
        if (!colorInput) {
            colorInput = document.createElement("input");
            colorInput.type = "color";
            colorInput.style.position = "absolute";
            colorInput.style.visibility = "hidden";
            container._colorInput = colorInput;
        }
        container.appendChild(colorInput);

        // append a swatch for each color
        this.colors.forEach((colorEntry, index) => {
            const swatch = document.createElement("div");
            swatch.className = "swatch";
            swatch.style.backgroundColor = colorEntry.color;
            if (colorEntry.disabled) swatch.classList.add("disabled");

            swatch.onmousedown = (e) => {
                e.preventDefault();

                switch (e.button) {
                case 0:
                    colorInput.value = colorEntry.color;
                    colorInput.oninput = (e) => this.updateColor(index, e.target.value);
                    colorInput.click();
                    break;
                case 1:
                    this.toggleColor(index);
                    break;
                }
            }

            swatch.oncontextmenu = (e) => {
                e.preventDefault();
                this.removeColor(index);
            }

            container.appendChild(swatch);
        });
    }
}
