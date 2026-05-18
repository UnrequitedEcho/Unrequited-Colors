precision highp float;

varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_sigmaColor;
uniform vec2 u_resolution;

const float SIGMA_SPATIAL = 6.;
const int RADIUS = int(SIGMA_SPATIAL) * 2;

void main() {
    vec3 x = texture2D(u_image, v_uv).xyz;

    float facS = -1. / (2. * SIGMA_SPATIAL * SIGMA_SPATIAL);
    float facL = -1. / (2. * u_sigmaColor * u_sigmaColor);

    float sumW = 0.;
    vec3 sumC = vec3(0.);
    vec2 texel = 1. / u_resolution;

    for (int i = -RADIUS; i <= RADIUS; i++){
        for (int j = -RADIUS; j <= RADIUS; j++){
            vec2 pos = vec2(i, j);
            vec3 offsetX = texture2D(u_image, v_uv + pos * texel).xyz;
            
            float distS2 = dot(pos, pos);
            float distL2 = dot(x - offsetX, x - offsetX);

            float w = exp(facS * distS2) * exp(facL * distL2);

            sumW += w;
            sumC += offsetX * w;
        }
    }
    gl_FragColor = vec4(sumC / sumW, 1.);
}