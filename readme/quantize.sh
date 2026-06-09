#!/bin/sh

for f in *-orig.jpg; do
	out=$(printf '%s' "$f" | sed 's/-orig\.jpg$/-quant.jpg/')
	gm convert "$f" -despeckle -median 1 +dither -remap palette.png "$out"
done 

# gm convert input.png -resize 1600x900 -depth 8 -strip -quality 95 output.jpg