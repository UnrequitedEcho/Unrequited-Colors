# [Unrequited Colors](https://unrequitedecho.github.io/Unrequited-Colors/)

*Because not all colors' love are reciprocated.*

Unrequited Colors is a tool for applying a constraining an image to a strict color palette. The goal is to be as *correct* as quantization, while preserving gradients and feeling more natural and stylish. Built with speed and interactivity in mind, it aims makes palette and parameter tweaking effortless. The most obvious use case is adapting wallpapers to match an application or system theme.

Below are some exemples, original on the left, UC on the right.

*Heavily Draculized Forest*
![Heavy Draculized Forest](assets/readme/sidebyside3.jpg)

*Tastefully Nordified Ashe*
![Tastefully Nordified Ashe](assets/readme/sidebyside2.jpg)

*Slightly Tokyo-ised Fuji*
![Slightly Tokyo-ised Fuji](assets/readme/sidebyside1.jpg)

## TL;DR

Go [here](https://unrequitedecho.github.io/Unrequited-Colors/) -> pick a palette -> load an image -> tweak the **Temperature** slider.

Stop when it looks amazing. Should not take long.

## How Tos

- Choose the temperature

  Each pixel is converted a weighted mix of the palette colors. The weights depend on how close the pixel is to each palette color (in a perceptual color space). The **Temperature** controls how sharp or smooth that mix is:

  - **Low temperature** -> one color dominates -> pretty much quantization (but never quite !)
  - **High temperature** -> all colors contribute equally -> washed out image

  The default range is tuned so that the sweet spot is usually near the middle, but don’t be afraid to push it.

- Choose a good palette

  This matters less than you might think. You can throw in your favorite 16 colors terminal theme, and it will usually work just fine. There’s a hard cap at 32 colors, and fewer than 2 doesn’t make much sense. 

  To go deeper, think of colors as points on a circle. Your palette a shape of allowable colors on that circle. So a **wide palette** will push the result closer to the original image, while a smaller one (whether because of fewer colors or colors closer to each other), will force more change.

  In practice, just load all the colors of your favorite theme. If a color you don't like shows up to much, disable it (middle click) or tweak it slightly (left click).

- Load a custom palette

  You can load a palette from a text file. The parser will autodetect anything that looks like and hex color. For example, this is a valid palette file : `#282a36 282a36 44475aff ["f8f8f2"] Some random text #282a36 `

  Duplicates are removed automatically, and only the first 32 colors are kept. If you already have a palette in a config file (CSS, JSON, theme files, etc.), you probably can import it with minimal modification.

## How it works (for the curious)

Don't let the scary math fool you, it's actuall pretty simple.

Each pixel color is first converted to the [OKLab color space](https://en.wikipedia.org/wiki/Oklab_color_space). Given a pixel color $`x`$ and a palette of colors $`C_N`$, also in OKLab, we compute a weight for each palette color $`C_i`$:

```math
w_i = \exp\left(-\left(\frac{d(x,C_i) - d_{\min}}{T}\right)^2\right)
```

where:

- $`d(x, c_i) = \|x - c_i\|^2`$ is the squared Euclidean distance in OKLab
- $`d_{\min} = \min_i d(x, c_i)`$
- $`T`$ is the temperature parameter

The final color is the weighted average of all the colors:

```math
y = \frac{\sum_i w_i c_i}{\sum_i w_i}
```

## Comparison to other techniques

### Overview 

There are 3 approaches to palette-based recoloring I know of:

- **Quantization**  
  The simplest method: each pixel is replaced by the closest color in the palette. It is fast and predictable, but produce hard boundaries. The result is very dependent on the choice and especially size of the palette. Dithering can help too. 

- [**ImageGoNord**](https://github.com/Schroedinger-Hat/ImageGoNord-Web)  
  At its core, this is also a quantization-based approach. It can optionally average pixels before quantization, which reduces noise slightly, and apply Gaussian blur afterward to smooth the result, but at the cost of the details. It can also act as a wrapper around PaletteNet (see below).

- [PaletteNet](https://openaccess.thecvf.com/content_cvpr_2017_workshops/w12/papers/Cho_PaletteNet_Image_Recolorization_CVPR_2017_paper.pdf)
  A machine learning approach. Given a palette (limited to 6 colors in the available open source implementation), it attempts to generate a plausible recolored image. From my experience, results can be impressive sometimes, but the process is a total black box. It seems to prefer real world photos over digital artwork, probably because of the training data.

### Comparison

All results use the same source images and as close to the 11 colors [Dracula](https://en.wikipedia.org/wiki/Dracula_(color_scheme)) palette as possible.

| Image | Original | ImageGoNord | PaletteNet | Quantization | Unrequited Colors |
|------|----------|-------------|-------------|--------------|-------------------|
| 1 | ![](assets/readme/1.jpg) | ![](assets/readme/1_ign.jpg) | ![](assets/readme/1_pn.jpg) | ![](assets/readme/1_q.jpg) | ![](assets/readme/1_uc.jpg) |
| 2 | ![](assets/readme/2.jpg) | ![](assets/readme/2_ign.jpg) | ![](assets/readme/2_pn.jpg) | ![](assets/readme/2_q.jpg) | ![](assets/readme/2_uc.jpg) |
| 3 | ![](assets/readme/3.jpg) | ![](assets/readme/3_ign.jpg) | ![](assets/readme/3_pn.jpg) | ![](assets/readme/3_q.jpg) | ![](assets/readme/3_uc.jpg) |
| 4 | ![](assets/readme/4.jpg) | ![](assets/readme/4_ign.jpg) | ![](assets/readme/4_pn.jpg) | ![](assets/readme/4_q.jpg) | ![](assets/readme/4_uc.jpg) |
| 5 | ![](assets/readme/5.jpg) | ![](assets/readme/5_ign.jpg) | ![](assets/readme/5_pn.jpg) | ![](assets/readme/5_q.jpg) | ![](assets/readme/5_uc.jpg) |

### Methodology

- **Original**
  - Downscaled only: `magick 1.png -resize 1200x1200\> -define jpeg:extent=300KB 1.jpg`

- **ImageGoNord**
  - 11 colors Dracula palette
  - `enable_avg_algorithm()`
  - No ML mode (wrapper for PaletteNet) or post process blur

- **PaletteNet**
  - Limited to 6 colors. Color chosen: `#282a36 #f8f8f2 #8be9fd #bd93f9 #ff79c6 #f1fa8c`

- **Quantization**
  - Palette creation: `magick xc:"#282a36" xc:"#44475a" xc:"#f8f8f2" xc:"#6272a4" xc:"#8be9fd" xc:"#50fa7b" xc:"#ffb86c" xc:"#ff79c6" xc:"#bd93f9" xc:"#ff5555" xc:"#f1fa8c" +append palette.png`
  - Quantization: `magick 1.jpg -remap palette.png 1_q.jpg`
  - Dithering enabled by default

- **Unrequited Colors**
  - 11 colors Dracula palette
  - Temperature manually adjusted (<= 5 seconds per image)
  - Output converted from PNG: `magick 1_uc.png 1_uc.jpg`

## FAQ

- I get banding in gradients

  First, check if the original image already has banding (seriously). If not, here are a few things you can try:

  - Increase the **Temperature** (more colors participate in blending => smoother transitions)
  - Add more (or more diverse) colors to the palette (especially colors near the banding)
  - Lower the temperature and make the banding a stylistic choice (try it, I dare you!)

  At the end of the day, you're limiting the color space, so some banding is unavoidable in certain cases.

- I don't want a website, I want to run it locally

  Then you are in luck! After the source code download from GitHub, everything already runs locally on your machine. All computations are done client-side (WebGL + JavaScript). Your images are never uploaded anywhere. Try it! open the website and disconnect from the Internet. It still works!

  If you really need to use it offline and not rely on your browser cache, clone the repo and start a local server, for exemple `python3 -m http.server`. Then open a web browser and go to [http://localhost:8000](http://localhost:8000)

  If enough people pester me for it, I might reimplement the core algorithm as a small CLI program.

- My favorite theme is not avaiable as a Preset

  You can manually add each color of your theme. You can also [load a custom theme from a file](#how-tos). If you think your theme might be helpful to the community and wish to contribute it, thank you! Palettes are stored in [`palettes.json`](./palettes.json). Each entry looks like this:

  ```json
  {
    "name": "My Palette",
    "colors": ["#112233", "#445566", "#778899"]
  }
  ```

  Remember to keep your palette below 32 colors, avoid duplicates colors, give it a unique name. Then open a Pull Request.

## Roadmap

### V2

- **Denoise preprocessing**  
  The algorithm doesn't play too nice with noise. A denoising preprocessing step would significantly improve results on some images.

- **Dithering**  
  Could help reduce banding in gradients, especially with small or stylized palettes.

### Maybe

- **Other optional pre-processing effects**
  Effects like brightness/constrast, vignette, blur... Don't want to make a new photoshop, though, so I'd be very selective about what I add there
