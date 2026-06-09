import { get, writable } from 'svelte/store';
import { computeMaxCropHeight, computeCropCenterLimits, type PaletteColor } from './utils';

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
	height: number;
	rotation: number;
	aspectRatio: number;
}
export const cropState = writable<CropState>({
	enabled: false,
	centerX: 0,
	centerY: 0,
	height: 1,
	rotation: 0,
	aspectRatio: 0
});

// Force crop box to stay within the image when updating the crop
export function updateCrop(partialCropState : Partial<CropState>) {
	const sourceImageValue = get(sourceImage);
	const cropStateValue = get(cropState);

	if (!sourceImageValue) return;
	const newCropState = {
		...cropStateValue,
		...partialCropState
	}

	const maxHeight = computeMaxCropHeight(
		sourceImageValue.bitmap.width, sourceImageValue.bitmap.height, 
		newCropState.rotation, newCropState.aspectRatio
	);
	newCropState.height = Math.min(newCropState.height, maxHeight);

	const [minC, maxC] = computeCropCenterLimits(
		sourceImageValue.bitmap.width, sourceImageValue.bitmap.height, newCropState.height,
		newCropState.rotation, newCropState.aspectRatio
	);

	newCropState.centerX = Math.max(minC.x, Math.min(maxC.x, newCropState.centerX));
	newCropState.centerY = Math.max(minC.y, Math.min(maxC.y, newCropState.centerY));

	cropState.set(newCropState);
}

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