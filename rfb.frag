precision highp float;

varying vec2 v_uv;

uniform sampler2D u_image;
uniform vec3 u_palette[32];     // in oklab
uniform int u_paletteSize;
uniform float u_sigma;
uniform int u_topk;

// https://bottosson.github.io/posts/oklab
vec3 rgb_to_oklab(vec3 c) {
    
    vec3 lrgb = mix(
        c / 12.92,
        pow((c + 0.055) / 1.055, vec3(2.4)),
        step(0.04045, c)
    );

    float l = dot(lrgb, vec3(0.4122214708, 0.5363325363, 0.0514459929));
    float m = dot(lrgb, vec3(0.2119034982, 0.6806995451, 0.1073969566));
    float s = dot(lrgb, vec3(0.0883024619, 0.2817188376, 0.6299787005));

    vec3 lms = vec3(
	    pow(l, 1.0/3.0),
	    pow(m, 1.0/3.0),
	    pow(s, 1.0/3.0)
	);

    return vec3(
        dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)),
        dot(lms, vec3(1.9779984951, -2.4285922050, 0.4505937099)),
        dot(lms, vec3(0.0259040371, 0.7827717662, -0.8086757660))
    );
}

// https://bottosson.github.io/posts/oklab
vec3 oklab_to_rgb(vec3 c) {

    float L = c.x, a = c.y, b = c.z;

    vec3 lms = vec3(
        L + 0.3963377774*a + 0.2158037573*b,
        L - 0.1055613458*a - 0.0638541728*b,
        L - 0.0894841775*a - 1.2914855480*b
    );

    lms = lms * lms * lms;

    vec3 rgb = vec3(
        dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
        dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
        dot(lms, vec3(-0.0041960863, -0.7034186147, 1.7076147010))
    );

    return mix(
        12.92 * rgb,
        1.055 * pow(rgb, vec3(1.0/2.4)) - 0.055,
        step(0.0031308, rgb)
    );
}

void main() {
    vec2 uv = v_uv;

    vec3 rgb = texture2D(u_image, uv).rgb;

    vec3 x = rgb_to_oklab(rgb);

    float d_sorted[32];
    vec3 c_sorted[32];
    for (int i = 0; i < 32; i++) {
        d_sorted[i] = 1e20;
    }

    // compute the distance for each color in the palette
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        vec3 c = u_palette[i];
        float d = dot(x - c, x - c);
        
        // insertion sort the distance and color
        for (int j = 0; j < 32; j++) {
            if (j >= u_topk) break;

            if (d < d_sorted[j]) {
                for (int s = 32 - 1; s > 0; s--) {
                    if (s >= u_topk) continue;
                    if (s <= j) continue;
                    d_sorted[s] = d_sorted[s - 1];
                    c_sorted[s] = c_sorted[s - 1];
                }

                d_sorted[j] = d;
                c_sorted[j] = c;

                break;
            }
        }
    }

    // weighted mix of the palette color in weight order
    vec3 result = vec3(0.0);
    float sum_w = 0.0;

    int colsize = u_paletteSize;
    if (u_topk < colsize) {
        colsize = u_topk;
    }

    for (int i = 0; i < 32; i++) {
        if (i >= colsize) break;

        float w = exp(-(d_sorted[i] - d_sorted[0]) / (2.0 * u_sigma * u_sigma));
        result += c_sorted[i] * w;
        sum_w += w;
    }
    
    result /= max(sum_w, 1e-9);

    vec3 out_rgb = oklab_to_rgb(result);
    gl_FragColor = vec4(out_rgb, 1.0);
}