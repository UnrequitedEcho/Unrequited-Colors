precision highp float;

varying vec2 v_uv;

uniform sampler2D u_image;

uniform float u_sigmaSpatial;
uniform float u_sigmaColor;
uniform vec2 u_resolution;

const int MAX_RADIUS = 10;

void main() {
    vec2 uv = v_uv;
    vec3 x = texture2D(u_image, uv).xyz;

    float facS = -1.0 / (2.0 * u_sigmaSpatial * u_sigmaSpatial);
    float facL = -1.0 / (2.0 * u_sigmaColor * u_sigmaColor);

    float sumW = 0.0;
    vec3 sumC = vec3(0.0);
    float radius = ceil(u_sigmaSpatial * 2.0);
    vec2 texel = 1.0 / u_resolution;

    for (int i = -MAX_RADIUS; i <= MAX_RADIUS; i++){
        if (abs(float(i)) > radius) continue;

        for (int j = -MAX_RADIUS; j <= MAX_RADIUS; j++){
            if (abs(float(j)) > radius) continue;

            vec2 pos = vec2(i, j);
            vec3 offsetX = texture2D(u_image, v_uv + pos * texel).xyz;
            
            float distS2 = dot(pos, pos);
            float distL2 = dot(x - offsetX, x - offsetX);

            float w = exp(facS * distS2) * exp(facL * distL2);

            sumW += w;
            sumC += offsetX * w;
        }
    }
    gl_FragColor = vec4(sumC / sumW, 1.0);
}