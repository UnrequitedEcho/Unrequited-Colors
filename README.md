# [Unrequited Colors](https://unrequitedecho.github.io/Unrequited-Colors/)

*Because not all colors' love are reciprocated.*

Unrequited Colors is a browser-based tool for constraining an image to a color palette. Unlike most similar programs, which rely on simple color quantization, UC uses a more sophisticated algorithm that blends palette colors together to produce smoother gradients while remaining faithful to the selected palette. It also includes a small set of pre- and post-processing filters designed specifically to complement the core algorithm. The primary use case is adapting wallpapers to match a desktop or system theme.

Unrequited Colors is not intended to be a full-featured image editor. If your image requires significant editing beyond palette conversion and basic cropping, it is probably best to make those adjustments in your preferred image editor before/after importing the image into UC.

Below are a few examples, with the original image on the left and the UC result on the right.

| Theme | Original | Unrequited Colors |
| ----- | -------- | ------------------|
| Nord | ![](/readme/digitalart-ashe-lol-orig.jpg) | ![](/readme/digitalart-ashe-lol-nord.jpg) |
| Gruvbox | ![](/readme/anime-cityscape-orig.jpg) | ![](/readme/anime-cityscape-gruvbox.jpg) |
| Dracula | ![](/readme/screenshot-mercy-orig.jpg) | ![](/readme/screenshot-mercy-uc.jpg) |
| Solarized | ![](/readme/anime-sunset-balcony-orig.jpg) | ![](/readme/anime-sunset-balcony-uc-solarized.jpg) |
| Dracula | ![](/readme/photo-interior-orig.jpg) | ![](/readme/photo-interior-uc.jpg) |

## TL;DR

- Go [here](https://unrequitedecho.github.io/Unrequited-Colors/)
- Click **Open Image**
- Pick a palette
- Tweak the **Color Mix** slider until it looks amazing.
- Click **Save Image**
- Find your picture in your **Downloads** folder

## Usage

After opening your picture: 

#### 1. Select your palette

If your prefered palette is not available as a preset, you can either edit the current palette manually (see below) or load a text file. The parser will autodetect anything that looks like and hex color. For example, this is a valid palette file : `#282a36 282a36 44475aff ["f8f8f2"] Some random text #282a36 `. Duplicates are removed automatically, and only the first 32 colors are kept. If you already have a palette in a config file (CSS, JSON, theme files...), you can probably import it directly or with minimal modification.

#### 2. Adjust the the `Palettize` -> `Color Mix` slider

Moving the slider all the way to the left tells the algorithm to select a single palette color for each pixel (pretty much quantization). Moving it to the right allows the algorithm to blend multiple palette colors together, producing smoother gradients. You most likely want something in between. *Tip: you can use the mouse wheel while hovering over any slider for finer control.*

#### 3. Adjust the Palette

If you notice a color that obviously doesn't belong in the preview, disable or remove it. If your palette is too small, the algorithm may struggle to produce nice gradients. In that case you may need to add colors to your palette. The palette controls are:

- New Color: Left click the last color swatch
- Change a color: Left click on the corresponding swatch 
- Remove a color: Right click on the the corresponding swatch
- Temporarily disable a color: Middle or Shift + Right click on the the corresponding swatch

#### 4. (OPTIONAL) Activate `Smart Blur` and adjust the `Strength` slider

The paletization algorithm is very sensitive to noise. In many cases, a small amount of blur can help a lot. Unlike a traditional blur, Smart Blur preserves edges while smoothing noise. If you push it, you might also get some artistic/painterly effects which you might enjoy.

| Original (Worst case scenario) | After Paletization | With Smart Blur |
|--------------------------------|--------------------|-----------------|
| ![](/readme/noise-orig.jpg) | ![](/readme/noise-palettized.jpg) | ![](/readme/noise-smartblur.jpg) |

#### 5. (OPTIONAL) Activate `Color Adjustements`. 

If you cannot get the effect you are looking for, the `Color Adjustments` filters might help. **These adjustments are applied before palette conversion, not after it.** They are designed to influence how the algorithm interprets the image rather than to directly change the final colors. Because of this, the sliders may not always behave as you would expect. For example, the `Shadows` slider cannot make a pixel darker than the darkest color available in your palette. Similarly, rotating the Hue can help adapt an image whose original colors are very different from those of the selected palette.

For best results, **leave the Palettize filter enabled** while adjusting these controls.

#### 6. (OPTIONAL) Activate the `Luma Grain` and adjust the slider.

If you notice some banding, even after increasing the `Palettize` -> `Color Mix` slider, you may want to activate the `Luma Grain`. Start at the minimum, and slowly increase it until the banding disappears. It should be mostly imperceptible unless you are pixel peeping.

#### 7. Readjust the `Palettize` -> `Color Mix`. 

You probably only need small adjustments at this point, if any.

#### 8. (OPTIONAL) `Crop` the image as needed

Activate the `Crop` tool and select your preffered aspect ratio. To set the size and the center of the crop box, click the **Adjust Crop** button, then click on the preview and scroll the moouse wheel. Click the button again (or press Escape) to exit crop mode. The crop tool guarantees that the crop region always remains fully inside the image boundaries. Make sure the final resolution is high enough for your use case. 

#### 9. Save the image

You can rename the image before saving it. Setting a different extension (`.jpg/.jpeg`, `.png` ou `.webp`) will convert the exported image.

## How it works

The core palette conversion algorithm is a form of Radial Basis Function (RBF) interpolation. For each pixel, the algorithm computes a weighted average of the colors in the palette. These weights depend on the distance between the pixel color and each palette color in [OKLab space](https://en.wikipedia.org/wiki/Oklab_color_space). Unlike traditional RBF implementations, which often use Gaussian kernels, UC uses a linear kernel relative to the closest palette color. This prevents distant palette colors from contributing tiny but non-zero amounts everywhere in the image, helping to preserve contrast and reduce the influence of outlier colors.

All image processing is implemented as a pipeline of WebGL2 shaders and runs entirely on the GPU. Colors are converted to OKLab in the first pipeline step  and converted back to RGB in the last, making every shader work in OKLab. Rendering is performed on change rather than continuously, and the renderer processes the image in tiles so it can periodically give back control back to the browser and keep the interface responsive, even on slower hardware.

The "Smart Blur" filter is a bilateral filter with a fixed radius of 12 pixels. Despite optimizations, it remains one of the more expensive filters in the pipeline and it's result is therefore cached.

## Comparison to other techniques - or why do I need UC?

There are 3 approaches to palette-based recoloring I know of:

- **Quantization based**  
  The simplest method: each pixel is replaced by the closest color in the palette. It is fast and easy to understand, but produce hard boundaries between colors. The result is very dependent on the choice and especially size of the palette. Dithering can help too. This is what the popular [ImageGoNord](https://github.com/Schroedinger-Hat/ImageGoNord-Web), with some optional pixel averaging and gaussian blur post process. From my experience, you can get good results, but it requires a lot of tweaking. You probably will want some kind of denoising prepass, and a custom palette with a lot of intermediate colors. All of this can be done much easier with instant feedback using Unerquited Colors.

- **Radial Basis Function based**
  Instead of selecting a single palette color for each pixel, thes method blends multiple palette colors together to produce new intermediate colors. The results depend a lot on implementation. Besides Unrequited Colors, I am only aware of a single tool making use of this approach : [Gowall](https://github.com/Achno/gowall).

- **Machine Learning based**
  The most well known option is [PaletteNet](https://openaccess.thecvf.com/content_cvpr_2017_workshops/w12/papers/Cho_PaletteNet_Image_Recolorization_CVPR_2017_paper.pdf). From my limited experience, results can be impressive sometimes, but you get very little control over the final result. It seems to prefer real world photos and struggles with digital artwork, probably because of the training data. The open source implementation is limited to a 6 color palette.

The examples below are intended to illustrate the strengths and weaknesses of each approach. All algorightm are fed the same source images and a palette picked from a combination or a portion of the 11 [Dracula](https://draculatheme.com/contribute) colors. Some time was spent tuning the parameters of each method to produce representative results. Better results are possible for each with additional tweaking, different palettes, or different source images.

To keep the comparison reasonably fair, I limited myself to roughly two minutes of adjustment time in Unrequited Colors for each image.

| Original | Quantization | PaletteNet | Unrequited Colors | 
|----------|--------------|------------|-------------------|
| ![](/readme/anime-cityscape-orig.jpg)      | ![](/readme/anime-cityscape-quant.jpg)      | ![](/readme/anime-cityscape-palettenet.jpg)      | ![](/readme/anime-cityscape-uc.jpg)      |
| ![](/readme/screenshot-mercy-orig.jpg)     | ![](/readme/screenshot-mercy-quant.jpg)     | ![](/readme/screenshot-mercy-palettenet.jpg)     | ![](/readme/screenshot-mercy-uc.jpg)     |
| ![](/readme/photo-interior-orig.jpg)       | ![](/readme/photo-interior-quant.jpg)       | ![](/readme/photo-interior-palettenet.jpg)       | ![](/readme/photo-interior-uc.jpg)       |
| ![](/readme/anime-sunset-balcony-orig.jpg) | ![](/readme/anime-sunset-balcony-quant.jpg) | ![](/readme/anime-sunset-balcony-palettenet.jpg) | ![](/readme/anime-sunset-balcony-uc.jpg) |

## FAQ

- The result contains colors that are not in my palette

  This is expected. Unrequited Colors blends palette colors together to create smoother gradients. If you want each pixel to be replaced by a single palette color, reduce `Palettize` → `Color Mix` to the minimum.

- I get color banding in gradients

  First, check if the original image already has banding (seriously). If not, here are a few things you can try:

  - Increase the **Palettize -> Color Mix** (more colors participate in blending => smoother transitions)
  - Add more (or more diverse) colors to the palette (especially colors near the banding)
  - Enable the **Luma Grain** post processing effect as a last resort.

  At the end of the day, you're limiting the color space, so some banding is unavoidable in certain cases.

- I don't want a website, I want to run it locally

  Then you are in luck! Once the source code has been downloaded by your browser, everything runs locally on your machine. All computations are performed client-side on your own GPU. Your images are never uploaded anywhere. Try it! Open the website and disconnect from the Internet. It still works!

  If you need to use it completely offline cannot rely on the browser cache, clone the repository and start a local web server, for example: `python3 -m http.server`. Then open your browser and go to [http://localhost:8000](http://localhost:8000).

  If enough people pester me for it, I might reimplement the core algorithm as a small CLI program.

- My favorite theme is not avaiable as a Preset

  You can manually edit the palette or load a custom palette from a file. If you think your theme might be helpful to others and wish to contribute it, thank you! Palettes are stored in [`palettes.json`](./palettes.json). Each entry looks like this:

  ```json
  {
    "name": "My Palette",
    "colors": ["#112233", "#445566", "#778899"]
  }
  ```

  Please keep palettes to 32 colors or fewer, avoid duplicates colors, give it a unique name. Then open a Pull Request.

## Roadmap

### V4

- **Nothing for now**  

### Maybe

- **Other optional pre/post processing effects**
  Effects like vignette, blur... Don't want to make a new photoshop, though, so I'd be very selective about what I add there

- **Electron/Tauri desktop app**
  Not worth the effort for now, but if there is enough demand...
