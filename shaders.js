export const causticVertexShader = `
    precision mediump float;
    varying vec2 vUV;
    varying vec3 vPos;

    void main() {
        vUV = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const causticMapFragmentShader = `
    precision mediump float;
    varying vec2 vUV;
    varying vec3 vPos;

    uniform sampler2D uTexture;
    uniform vec3 uLight;
    uniform float uIntensity;

    void main() {
        vec2 uv = vUV;
        vec3 normalTexture = texture2D(uTexture, uv).rgb;
        vec3 normal = normalize(normalTexture);
        vec3 lightDir = normalize(uLight);
        vec3 ray = refract(lightDir, normal, 1.0/1.33); // uses snell's law  :D air to water use 1.5 for glass

        vec3 newPos = vPos.xyz + ray;
        vec3 oldPos = vPos.xyz;

        float oldArea = length(dFdx(oldPos)) * length(dFdy(oldPos));
        float newArea = length(dFdx(newPos)) * length(dFdy(newPos));

        float color = oldArea / newArea;
        float scale = clamp(color, 0.0, 1.0) * uIntensity;
        scale = pow(scale, 2.0);

        gl_FragColor = vec4(vec3(scale), 1.0);
    }
`;

export const causticMaterialFragmentShader = `
    precision mediump float;
    uniform sampler2D uTexture;
    uniform float uAberration;
    uniform bool uChromatic;

    varying vec2 vUV;

    const int SAMPLES = 16;

    float random(vec2 p){
        return fract(sin(dot(p.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    vec3 sat(vec3 rgb, float adjustment) {
        const vec3 W = vec3(0.2125, 0.7154, 0.0721);
        vec3 intensity = vec3(dot(rgb, W));
        return mix(intensity, rgb, adjustment);
    }

    void main() {
        vec2 uv = vUV;
        vec4 color = vec4(0.0);
        
        vec3 refractCol = vec3(0.0);

        float flip = -0.5;

        for ( int i = 0; i < SAMPLES; i ++ ) {
            float noiseIntensity = 0.01; 
            float noise = random(uv) * noiseIntensity;

            // 4 point aberration from heckel
            float slide = float(i) / float(SAMPLES) * 0.1 + noise;
            // float mult = i % 2 == 0 ? 1.0 : -1.0;
            // flip *= mult;
            // vec2 dir = i % 2 == 0 ? vec2(flip, 0.0) : vec2(0.0, flip);

            // circular abberation
            // float angle = float(i) / float(SAMPLES) * 6.2831853;
            // vec2 dir = vec2(cos(angle), sin(angle));
            // dir *= vec2(2.0, 0.3);

            // astigmatism abberation
            vec2 dir;
            int m = i % 4;
            if (m == 0) dir = vec2(1.0, 0.0);   // +X
            if (m == 1) dir = vec2(-1.0, 0.0);  // -X
            if (m == 2) dir = vec2(0.0, 1.0);   // +Y
            if (m == 3) dir = vec2(0.0, -1.0);  // -Y
            float xStrength = 1.5;
            float yStrength = 0.3;
            dir.x *= xStrength;
            dir.y *= yStrength;

            if(uChromatic) {
                refractCol.r += texture2D(uTexture, uv + (uAberration * slide * dir * 1.0) ).r;
                refractCol.g += texture2D(uTexture, uv + (uAberration * slide * dir * 2.0) ).g;
                refractCol.b += texture2D(uTexture, uv + (uAberration * slide * dir * 3.0) ).b;
            } else {
                float sampleValue = texture2D(uTexture, uv + (uAberration * slide * dir * 2.0)).g;
                refractCol += vec3(sampleValue);
            }
        }
        // Divide by the number of layers to normalize colors (rgb values can be worth up to the value of SAMPLES)
        refractCol /= float(SAMPLES);
        refractCol = sat(refractCol, 1.33);

        color = vec4(refractCol.r, refractCol.g, refractCol.b, 1.0);

        gl_FragColor = vec4(color.rgb, 1.0);

        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;