#!/bin/sh

for f in *-orig.jpg; do
	out=$(printf '%s' "$f" | sed 's/-orig\.jpg$/-quant.jpg/')
	gm convert "$f" -despeckle -median 1 +dither -remap palette.png "$out"
done 
