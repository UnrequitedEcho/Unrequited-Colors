precision highp float;

varying vec2 v_uv;
uniform sampler2D u_image;
uniform vec3 u_palette[32];
uniform int u_paletteSize;
uniform float u_sigma;
uniform float u_chromaBias;

void main() {
    vec3 c = texture2D(u_image, v_uv).xyz;

    // compute the distances for each color in the palette
    float d[32];
    float d_min = 1e20;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;


        vec3 delta = c - u_palette[i];
        float palChroma = length(u_palette[i].yz);
        d[i] = delta.x * delta.x + dot(delta.yz, delta.yz);
        d[i] /= (1. + u_chromaBias * palChroma);
        if (d[i] < d_min) d_min = d[i];
    }

    // weighted mix of the palette color in weight order
    vec3 result = vec3(0.);
    float sum_w = 0.;
    for (int i = 0; i < 32; i++) {
        if (i >= u_paletteSize) break;

        float a = (d[i] - d_min) / (u_sigma * u_sigma);
        float w = pow(max(0., 1. - a), 2. + (u_chromaBias / 4.));
        result += u_palette[i] * w;
        sum_w += w;
    }
    
    result /= max(sum_w, 1e-9);

    gl_FragColor = vec4(result, 1.);
}