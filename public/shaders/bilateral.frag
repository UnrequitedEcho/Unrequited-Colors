#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform float u_sigmaColor;
uniform float u_spatialWeights[25];

const float SIGMA_SPATIAL = 6.;
const int RADIUS = int(SIGMA_SPATIAL) * 2;

void main() {
    vec3 x = texture(u_image, v_uv).xyz;

    float facL = -1. / (2. * u_sigmaColor * u_sigmaColor);
    float sumW = 0.;
    vec3 sumC = vec3(0.);
    ivec2 xPos = ivec2(gl_FragCoord.xy);
    
    for (int i = -RADIUS; i <= RADIUS; i++){
        for (int j = -RADIUS; j <= RADIUS; j++){

            vec3 offsetX = texelFetch(u_image, xPos + ivec2(i, j), 0).xyz;
            vec3 distL = x - offsetX;
            float distL2 = dot(distL, distL);

            float w = exp(facL * distL2) * (u_spatialWeights[i + RADIUS] * u_spatialWeights[j + RADIUS]);

            sumW += w;
            sumC += offsetX * w;
        }
    }
    fragColor = vec4(sumC / sumW, 1.);
}