precision highp float;

varying vec2 v_uv;
uniform sampler2D u_image;

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
    vec3 lab = texture2D(u_image, v_uv).rgb;
    vec3 rgb = oklab_to_rgb(lab);

    gl_FragColor = vec4(rgb, 1.0);
}