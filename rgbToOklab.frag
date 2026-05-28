#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;

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

void main() {
    vec3 rgb = texture(u_image, v_uv).rgb;
    vec3 lab = rgb_to_oklab(rgb);

    fragColor = vec4(lab, 1.0);
}