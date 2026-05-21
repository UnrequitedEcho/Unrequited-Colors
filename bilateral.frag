precision highp float;

varying vec2 v_uv;
uniform sampler2D u_image;
uniform float u_sigmaColor;
uniform vec2 u_resolution;
uniform float u_spatialWeights[25];

const float SIGMA_SPATIAL = 6.;
const int RADIUS = int(SIGMA_SPATIAL) * 2;

void main() {
    vec3 x = texture2D(u_image, v_uv).xyz;

    float facL = -1. / (2. * u_sigmaColor * u_sigmaColor);
    float sumW = 0.;
    vec3 sumC = vec3(0.);
    vec2 texel = 1. / u_resolution;

    for (int i = -RADIUS; i <= RADIUS; i++){
        for (int j = -RADIUS; j <= RADIUS; j++){
            vec2 pos = vec2(i, j);

            vec3 offsetX = texture2D(u_image, v_uv + pos * texel).xyz;
            vec3 distL = x - offsetX;
            float distL2 = dot(distL, distL);

            float w = exp(facL * distL2) * (u_spatialWeights[i + RADIUS] * u_spatialWeights[j + RADIUS]);

            sumW += w;
            sumC += offsetX * w;
        }
    }
    gl_FragColor = vec4(sumC / sumW, 1.);
}