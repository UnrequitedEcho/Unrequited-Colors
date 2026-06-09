#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform vec3 u_palette[32];
uniform int u_paletteSize;
uniform float u_sigma;

void main() {
    vec3 c = texture(u_image, v_uv).xyz;

    // compute the distances for each color in the palette
    float d[32];
    float d_min = 1e20;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;


        vec3 delta = c - u_palette[i];
        d[i] = delta.x * delta.x + dot(delta.yz, delta.yz);
        if (d[i] < d_min) d_min = d[i];
    }

    // weighted mix of the palette color in weight order
    vec3 result = vec3(0.);
    float sum_w = 0.;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        float a = (d[i] - d_min) / (u_sigma * u_sigma);
        float w = max(0., 1. - a);
        result += u_palette[i] * w;
        sum_w += w;
    }
    
    result /= max(sum_w, 1e-9);

    fragColor = vec4(result, 1.);
}