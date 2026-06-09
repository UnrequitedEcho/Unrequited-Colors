export interface PalettePreset {
    name: string;
    colors: string[];
}

export interface PaletteColor {
	color: string;
	enabled: boolean;
}

export async function pickTextFile(): Promise<string> {
	const input = document.createElement("input");
	input.type = "file";

	const file = await new Promise<File | null>((resolve) => {
		input.onchange = () => {
			resolve(input.files?.[0] ?? null);
		};
		input.click();
	});

	if (!file) throw new Error("No file selected");
	return await file.text();
}

export async function pickColor(initialColor = "#ffffff"): Promise<string | null> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "color";
		input.value = initialColor;

		input.onchange = () => {
			resolve(input.value);
			input.remove();
		};

		input.click();
	});
}

export function canvasToImage(px: number, py: number, imgW: number, imgH: number, offsetX: number, offsetY: number, s: number, r: number) {
    // undo translation and scale
    px = (px - offsetX) / s;
    py = (py - offsetY) / s;

    // undo rotation: translate to rotation center -> rotate -> translate back
    px -= imgW / 2;
    py -= imgH / 2;

    r *= Math.PI / 180;
    const rx = px * Math.cos(r) - py * Math.sin(r);
    const ry = px * Math.sin(r) + py * Math.cos(r);

    px = rx + imgW / 2;
    py = ry + imgH / 2;
    return [ px, py ];
}

export function imageToCanvas(px: number, py: number, imgW: number, imgH: number, offsetX: number, offsetY: number, s: number, r: number) {
	// rotation: translate to rotation center -> rotate -> translate back
	px -= imgW / 2;
    py -= imgH / 2;

    r *= -1 * Math.PI / 180;
    const rx = px * Math.cos(r) - py * Math.sin(r);
    const ry = px * Math.sin(r) + py * Math.cos(r);

    px = rx + imgW / 2;
    py = ry + imgH / 2;

    // apply scale + translation
    px = px * s + offsetX;
    py = py * s + offsetY;
    return [ px, py ];
}

function computeRotatedDirs(ar: number, r: number) {
	r *= Math.PI / 180;
	const cos = Math.cos(r);
	const sin = Math.sin(r);

    const dirs = [
	    { x: -ar/2, y: -0.5 },
	    { x:  ar/2, y: -0.5 },
	    { x:  ar/2, y:  0.5 },
	    { x: -ar/2, y:  0.5 },
	];

	return dirs.map(d => ({
	    x: d.x * cos - d.y * sin,
	    y: d.x * sin + d.y * cos
	}));
} 

export function computeMaxCropHeight(imgW: number, imgH: number, r: number, ar: number) {
	const rotatedDirs = computeRotatedDirs(ar, r);

	let maxH = Infinity;

	for (const d of rotatedDirs) {
	    if (d.x > 0) maxH = Math.min(maxH, imgW / (2 * d.x));
	    if (d.x < 0) maxH = Math.min(maxH, imgW / (-2 * d.x));

	    if (d.y > 0) maxH = Math.min(maxH, imgH / (2 * d.y));
	    if (d.y < 0) maxH = Math.min(maxH, imgH / (-2 * d.y));
	}

	return maxH
}

export function computeCropCenterLimits(imgW: number, imgH: number, h: number, r: number, ar: number) {
	let minC = { x: -Infinity, y: -Infinity };
	let maxC = { x: Infinity,  y:  Infinity };

	const rotatedDirs = computeRotatedDirs(ar, r);

	for (const d of rotatedDirs) {
		minC = {
			x: Math.max(minC.x, -h * d.x),
			y: Math.max(minC.y, -h * d.y)
		}

		maxC = {
			x: Math.min(maxC.x, imgW - h * d.x),
			y: Math.min(maxC.y, imgH - h * d.y)
		}
	}

	return [minC, maxC];
}

export function getUniformLocation(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
    const loc = gl.getUniformLocation(program, name);
    if (loc === null) throw new Error(`Uniform '${name}' not found`);
    return loc;
}