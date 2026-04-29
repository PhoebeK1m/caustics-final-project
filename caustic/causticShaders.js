export const causticVertexShader = `
    precision highp float;
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
    precision highp float;
    varying vec2 vUV;
    varying vec3 vPos;

    uniform sampler2D uTexture;
    uniform vec3 uLight;
    uniform float uIntensity;

    uniform sampler2D uDepthTexture;
    
    uniform mat4 uLightMatrix;

    uniform float uRayMaxDistance;
    uniform float uDepthBias;

    vec3 projectToDepthUV(vec3 worldPos) {
        vec4 clip = uLightMatrix * vec4(worldPos, 1.0);
        vec3 ndc = clip.xyz / clip.w;

        return vec3(
            ndc.xy * 0.5 + 0.5,
            ndc.z * 0.5 + 0.5
        );
    }

    // optimize in logn maybe?? is working fine right now though...
    vec3 findRayLanding(vec3 startPos, vec3 rayDir) {
        vec3 lastPos = startPos;

        for (int i = 1; i <= 32; i++) {
            float t = float(i) / 32.0 * uRayMaxDistance;
            vec3 p = startPos + rayDir * t;

            vec3 projected = projectToDepthUV(p);

            if (
                projected.x < 0.0 || projected.x > 1.0 ||
                projected.y < 0.0 || projected.y > 1.0
            ) {
                continue;
            }

            float sceneDepth = texture2D(uDepthTexture, projected.xy).r;

            if (projected.z >= sceneDepth - uDepthBias) {
                return p;
            }

            lastPos = p;
        }

        return lastPos;
    }

    void main() {
        vec2 uv = vUV;
        vec3 normalTexture = texture2D(uTexture, uv).rgb;
        vec3 normal = normalize(normalTexture);
        vec3 lightDir = normalize(uLight);
        // vec3 lightDir = normalize(vPos - uLight);
        vec3 ray = refract(lightDir, normal, 1.0/1.33); // uses snell's law  :D air to water use 1.5 for glass

        vec3 newPos = vPos.xyz + ray;
        vec3 oldPos = vPos.xyz;
        // vec3 newPos = findRayLanding(oldPos, ray);

        // float oldArea = length(cross((dFdx(oldPos)), (dFdy(oldPos))));
        // float newArea = length(cross((dFdx(newPos)), (dFdy(newPos))));

        float oldArea = length(dFdx(oldPos)) * length(dFdy(oldPos));
        float newArea = length(dFdx(newPos)) * length(dFdy(newPos));

        // float color = oldArea / newArea;
        float color = oldArea / max(newArea, 1e-5); 
        float scale = clamp(color, 0.0, 1.0) * uIntensity;
        scale = pow(scale, 2.0);

        gl_FragColor = vec4(vec3(scale), 1.0);
    }
`;

export const causticMaterialFragmentShader = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform float uAberration;
    uniform bool uChromatic;

    varying vec2 vUV;

    const int SAMPLES = 36;

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
            float yStrength = 0.5;
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

export const receiveCausticMaterialFragmentShader = `
    uniform sampler2D uCausticTexture;
    uniform mat4 uCausticMatrix;
    uniform vec3 uBaseColor;
    uniform float uCausticStrength;

    varying vec3 vPos;

    void main() {
        vec4 projected = uCausticMatrix * vec4(vPos, 1.0);
        vec3 ndc = projected.xyz / projected.w;
        vec2 causticUV = ndc.xy * 0.5 + 0.5;

        vec3 caustic = vec3(0.0);

        if (
            causticUV.x >= 0.0 && causticUV.x <= 1.0 &&
            causticUV.y >= 0.0 && causticUV.y <= 1.0
        ) {
            caustic = texture2D(uCausticTexture, causticUV).rgb;
        }

        vec3 color = uBaseColor + caustic * uCausticStrength;
        // gl_FragColor = vec4(color, 1.0);
        gl_FragColor = vec4(texture2D(uCausticTexture, causticUV).rgb * 10.0, 1.0);
    }
`;

export const causticMeshVertexShader = `
precision highp float;

uniform sampler2D uWaterTexture;
uniform vec3 uLightDir;
uniform float uWaterSize;
uniform float uFloorY;
uniform float uIntensity;

varying vec3 vOldPos;
varying vec3 vNewPos;

const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;

vec3 projectToFloor(vec3 origin, vec3 ray) {
    float t = (uFloorY - origin.y) / ray.y;
    return origin + ray * t;
}

void main() {
    vec2 waterUV = uv;

    // assuming your sim texture stores height in .r and slopes/normals in .ba like Evan
    vec4 info = texture2D(uWaterTexture, waterUV);

    vec3 localPos = position;
    vec3 worldFlat = (modelMatrix * vec4(localPos, 1.0)).xyz;

    vec3 worldWater = worldFlat;
    worldWater.y += info.r;

    // If info.ba are slopes:
    vec2 slope = info.ba * 0.5;
    vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

    vec3 baseRay = refract(-normalize(uLightDir), vec3(0.0, 1.0, 0.0), IOR_AIR / IOR_WATER);
    vec3 bentRay = refract(-normalize(uLightDir), normal, IOR_AIR / IOR_WATER);

    vOldPos = projectToFloor(worldFlat, baseRay);
    vNewPos = projectToFloor(worldWater, bentRay);

    // Map floor xz into caustic texture clip space.
    vec2 causticNDC = vNewPos.xz / (uWaterSize * 0.5);

    gl_Position = vec4(causticNDC, 0.0, 1.0);
}
`;

export const causticMeshFragmentShader = `
precision highp float;

uniform float uIntensity;

varying vec3 vOldPos;
varying vec3 vNewPos;

void main() {
    // float oldArea = length(cross(dFdx(vOldPos), dFdy(vOldPos)));
    // float newArea = length(cross(dFdx(vNewPos), dFdy(vNewPos)));
    float oldArea = length(dFdx(vOldPos)) * length(dFdy(vOldPos));
    float newArea = length(dFdx(vNewPos)) * length(dFdy(vNewPos));

    float ratio = oldArea / max(newArea, 1e-5);

    // caustics are only the focused extra light above baseline
    float focus = max(ratio - 1.0, 0.0);

    // smoother gradient
    float c = log(1.0 + focus * 2.0);
    c = smoothstep(0.0, 1.5, c);

    gl_FragColor = vec4(vec3(c * uIntensity), 1.0);
}
`;