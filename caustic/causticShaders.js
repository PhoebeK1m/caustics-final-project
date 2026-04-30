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
        causticUV.y = 1.0 - causticUV.y;
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

        vec3 lightRay = -normalize(uLightDir);
        vec2 slope = info.ba * 2.0 - 1.0;
        vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

        vec3 baseRay = refract(lightRay, vec3(0.0, 1.0, 0.0), 1.0 / 1.333);
        vec3 bentRay = refract(lightRay, normal, 1.0 / 1.333);

        vOldPos = projectToFloor(worldFlat, baseRay);
        vNewPos = projectToFloor(worldWater, bentRay);

        // Map floor xz into caustic texture clip space.
        vec2 causticNDC = uv * 2.0 - 1.0;
        causticNDC.y *= -1.0;

        gl_Position = vec4(causticNDC, 0.0, 1.0);
}
`;

export const causticMeshFragmentShader = `
    precision highp float;

    uniform float uIntensity;

    varying vec3 vOldPos;
    varying vec3 vNewPos;
    uniform vec3 uCausticColor;

    void main() {
        float oldArea = length(cross(dFdx(vOldPos), dFdy(vOldPos)));
        float newArea = length(cross(dFdx(vNewPos), dFdy(vNewPos)));

        float ratio = oldArea / max(newArea, 1e-7);

        float c = ratio;

        c = max(c - 0.75, 0.0);

        c = pow(c, 2.6);

        c = clamp(c, 0.0, 12.0);
        vec3 baseBlue = vec3(0.2, 0.6, 1.0);
        vec3 causticColor = baseBlue * c * uIntensity;
        gl_FragColor = vec4(causticColor, 1.0);
}
`;