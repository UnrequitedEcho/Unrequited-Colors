import { writable } from 'svelte/store';

export interface SourceImage {
	filename: string;
	bitmap: ImageBitmap;
}
export const sourceImage = writable<SourceImage | null>(null);

export interface EffectsState {
	enabled: boolean;

	smartBlur: {
		enabled: boolean;
		strength: number;
	};

	colorAdjustments: {
		enabled: boolean
		brightness: number;
		saturation: number;
		shadows: number;
		highlights: number;
		hue: number;
	};

	palettization: {
		enabled: boolean;
		colorMix: number;

		palette: {
			colors: PaletteColor[];
			presetName: string | null;
		};
	};

	lumaGrain: {
		enabled: boolean;
		strength: number;
	};
}
export const effectsState = writable<EffectsState>({
	enabled: true,

	smartBlur: {
		enabled: false,
		strength: 0.01
	},

	colorAdjustments: {
		enabled: false,
		brightness: 0,
		saturation: 0,
		shadows: 0,
		highlights: 0,
		hue: 0
	},

	palettization: {
		enabled: true,
		colorMix: 0.15,
		palette: {
			colors: [],
			presetName: null
		}
	},

	lumaGrain: {
		enabled: false,
		strength: 0
	}
});

export interface CropState {
	enabled: boolean;
	centerX: number;
	centerY: number;
	scale: number;
	rotation: number;
	aspectRatio: number;
}
export const cropState = writable<CropState>({
	enabled: false,
	centerX: 0,
	centerY: 0,
	scale: 1,
	rotation: 0,
	aspectRatio: 0
});

export interface PreviewState {
	mode: "preview" | "cropEdit"
	offsetX: number;
	offsetY: number;
	scale: number;
	canvasWidth: number;
	canvasHeight: number;
}
export const previewState = writable<PreviewState> ({
	mode: "preview",
	offsetX: 0,
	offsetY: 0,
	scale: 1,
	canvasWidth: 0,
	canvasHeight: 0
});

export const resetPreviewRequest = writable<number>(0);