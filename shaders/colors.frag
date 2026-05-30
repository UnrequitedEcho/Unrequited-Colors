#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_brightness; // expected -1 -> 1
uniform float u_saturation;
uniform float u_shadows; 
uniform float u_highlights;
uniform float u_rotation;

#define EPS 1e-6

vec3 brightness(vec3 c) {
    return vec3(u_brightness, 0., 0.);
}

vec3 saturation(vec3 c) {
    float f = (u_saturation < 0.)
        ? pow(1. + u_saturation, 2.)
        : exp2(3. * u_saturation);
    return vec3(0., c.yz * (f - 1.0));
}

vec3 shadows(vec3 c) {
    vec3 d = vec3(0.);

    float k = mix(8.0, 1.5, abs(u_shadows)); // narrow threshold at low strength, wide at high strength
    float w = pow(1.0 - c.x, k); // shadow mask
    float strength = sign(u_shadows) * pow(abs(u_shadows), 1.5); // exponential response
    d.x = strength * w;

    return d;
}

vec3 highlights(vec3 c) {
    vec3 d = vec3(0.);

    float k = mix(8.0, 1.5, abs(u_highlights));
    float w = pow(c.x, k);
    float strength = sign(u_highlights) * pow(abs(u_highlights), 1.5);
    d.x = strength * w;

    return d;
}

vec3 rotate(vec3 c) {
    float rot = radians(u_rotation);
    float sn = sin(rot);
    float cs = cos(rot);

    vec3 d = vec3(
        0., 
        c.y * (cs - 1.) - c.z * sn, 
        c.y * sn + c.z * (cs - 1.)
    );
    return d;
}

void main() {
    vec3 c = texture(u_image, v_uv).xyz;
    vec3 cc = c;
    if (abs(u_rotation) > EPS) c += rotate(cc);
    if (abs(u_saturation) > EPS) c += saturation(c);
    if (abs(u_brightness) > EPS) c += brightness(cc);
    if (abs(u_shadows)    > EPS) c += shadows(cc);
    if (abs(u_highlights)  > EPS) c += highlights(cc);

    c.x = clamp(c.x, 0.0, 1.0);

    fragColor = vec4(c, 1.);
}

