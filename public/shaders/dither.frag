#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_granularity;

float rng(vec2 p) {
    p = fract(p * vec2(123.34, 345.45));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
}

void main() {
    vec3 c = texture(u_image, v_uv).xyz;
    float random = rng(v_uv) - 0.5;
    float attenuation = smoothstep(0.0, 0.5, c.x);
    float noise = random * attenuation * (u_granularity / 255.0);
    c.x = clamp(c.x + noise, 0.0, 1.0);
    fragColor = vec4(c, 1.0);
}