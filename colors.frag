precision highp float;

/* Contrast    contrast curve + tiny chroma compensation
Saturation  vibrance near 0, saturation at extremes
Shadows lift dark L + expand tonal range as strength increases
Highlights  compress bright L + expand tonal range as strength increases */

varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_contrast; // expected -1 -> 1
uniform float u_saturation; // expected -1 -> 1
uniform float u_shadows; 
uniform float u_highlights;

vec3 contrast(vec3 c) {
    vec3 d = vec3(0.);
    float x = (c.x - 0.5) * 2.; // 0 -> 1 to -1 -> 1
    float g = exp(-u_contrast);
    float xp = sign(x) * pow(abs(x), g);
    float L = xp * 0.5 + 0.5; // back to 0 -> 1
    d.x = L - c.x;

    // tiny chroma compensation in shadows
    float k = max(u_contrast, 0.);
    float scale = 1.0 + 0.08 * k * (1. - c.x);
    d.yz = (c.yz * scale) - c.yz;

    return d;
}

vec3 saturation(vec3 c) {
    vec3 d = vec3(0.);

    float sat_scale = exp(0.8 * u_saturation);

    // Vibrance weight: Strong for muted colors, weak for saturated colors
    float chroma = length(c.yz);
    float vib = exp(-3.0 * chroma);
    float t = (u_saturation + 1.) * 0.5; // Blend between vibrance and true saturation
    float vib_scale = 1.0 + (sat_scale - 1.0) * vib;
    float scale = mix(vib_scale, sat_scale, t);

    d.yz = (c.yz * scale) - c.yz;

    return d;
}

vec3 shadows(vec3 c) {
    vec3 d = vec3(0.);

    float k = mix(8.0, 1.5, abs(u_shadows)); // narrow threshold at low strength, wide at high strength
    float w = pow(1.0 - c.x, k); // shadow mask
    d.x = 0.25 * u_shadows * w;

    return d;
}

vec3 highlights(vec3 c) {
    vec3 d = vec3(0.);

    float k = mix(8.0, 1.5, abs(u_highlights));
    float w = pow(c.x, k);
    d.x = 0.25 * u_highlights * w;

    return d;
}

void main() {
    vec3 c = texture2D(u_image, v_uv).xyz;
    if (u_contrast != 0.) c += contrast(c);
    if (u_saturation != 0.) c += saturation(c);
    if (u_shadows != 0.) c += shadows(c);
    if (u_highlights != 0.) c += highlights(c);

    gl_FragColor = vec4(c, 1.);
}


