export function createPassContainer({
    title,
    enabled = true,
    content,
    onToggle = () => {}
}) {
    const root = document.createElement("div");
    root.className = "pass";

    // Header
    const header = document.createElement("div");
    header.className = "pass-header";

    const left = document.createElement("div");
    left.className = "pass-title-row";

    const label = document.createElement("span");
    label.className = "pass-title";
    label.textContent = title;

    // toggle
    const switchLabel = document.createElement("label");
    switchLabel.className = "switch";

    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "toggle";
    toggle.checked = enabled;

    const slider = document.createElement("span");
    slider.className = "switch-slider";

    switchLabel.appendChild(toggle);
    switchLabel.appendChild(slider);

    left.appendChild(label);

    header.appendChild(left);
    header.appendChild(switchLabel);

    // Content
    const body = document.createElement("div");
    body.className = "pass-body";

    if (content) {
        body.appendChild(content);
    }

    // Toggle behavior
    function update() {
        body.style.display = toggle.checked ? "" : "none";
        root.classList.toggle("disabled", !toggle.checked);

        onToggle(toggle.checked);
    }

    toggle.onchange = update;

    update();

    root.appendChild(header);
    root.appendChild(body);

    return root;
}

export function createSlider({
    label,
    min = 0,
    max = 1,
    step = 0.01,
    value = 0,
    defaultValue = value,
    onInput = () => {},
    format = v => v.toFixed(2)
}) {
    const root = document.createElement("div");
    root.className = "slider-group";

    // Header Row: label value
    const headerRow = document.createElement("div");
    headerRow.className = "slider-headerRow";

    const labelEl = document.createElement("label");
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "slider-value";

    headerRow.appendChild(labelEl);
    headerRow.appendChild(valueEl);

    // SliderRow: slider reset
    const sliderRow = document.createElement("div");
    sliderRow.className = "slider-sliderRow";

    const resetBtn = document.createElement("button");
    resetBtn.className = "slider-reset";
    resetBtn.textContent = "⟲";

    // Slider
    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "slider";

    sliderRow.appendChild(slider);
    sliderRow.appendChild(resetBtn);

    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = value;

    // State sync
    function update(v, emit = true) {
        slider.value = v;
        valueEl.textContent = format(Number(v));

        if (emit) {
            onInput(Number(v));
        }
    }

    slider.oninput = () => {
        update(slider.value);
    };

    resetBtn.onclick = () => {
        update(defaultValue);
    };

    update(value, false);

    root.appendChild(headerRow);
    root.appendChild(sliderRow);

    return root;
}