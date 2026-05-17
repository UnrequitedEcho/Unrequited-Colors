precision highp float;

varying vec2 v_uv;

uniform sampler2D u_image;
uniform vec3 u_palette[32];     // in oklab
uniform int u_paletteSize;
uniform float u_sigma;

void main() {
    vec2 uv = v_uv;

    vec3 x = texture2D(u_image, uv).xyz;

    // compute the distances for each color in the palette
    float d[32];
    float d_min = 1e20;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        vec3 c = u_palette[i];
        d[i] = dot(x - c, x - c);
        if (d[i] < d_min) d_min = d[i];
    }

    // weighted mix of the palette color in weight order
    vec3 result = vec3(0.0);
    float sum_w = 0.0;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        float a = (d[i] - d_min) / (u_sigma * u_sigma);
        float w = pow(max(0.0, 1.0 - a), 2.0);
        result += u_palette[i] * w;
        sum_w += w;
    }
    
    result /= max(sum_w, 1e-9);

    gl_FragColor = vec4(result, 1.0);
}