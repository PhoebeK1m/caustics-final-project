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
    precision highp float;

    uniform sampler2D uCausticTexture; // caustic light texture
    uniform vec3 uBaseColor;           // base color of the surface
    uniform float uCausticStrength;    // how strong the caustics show up

    uniform vec3 uWaterCenter; // center of the water area
    uniform float uWaterSize;  // size of the water plane

    varying vec3 vPos; // world position from vertex shader

    void main() {
        vec2 causticUV;

        // map world xz position into 0–1 uv space of the caustic texture
        causticUV = (vPos.xz - uWaterCenter.xz) / uWaterSize + 0.5;

        vec3 caustic = vec3(0.0);

        // only sample texture if we're inside the water bounds
        if (
            causticUV.x >= 0.0 && causticUV.x <= 1.0 &&
            causticUV.y >= 0.0 && causticUV.y <= 1.0
        ) {
            caustic = texture2D(uCausticTexture, causticUV).rgb;
        }

        // add caustic lighting on top of base color
        vec3 color = uBaseColor + caustic * uCausticStrength;

        gl_FragColor = vec4(color, 1.0);
    }
`;

export const causticMeshVertexShader = `
    precision highp float;

    uniform sampler2D uWaterTexture; // texture storing water height + slope
    uniform vec3 uLightDir;
    uniform float uWaterSize; // size of water plane
    uniform float uFloorY; // y pos of floor

    varying vec3 vOldPos; // where light would hit without waves
    varying vec3 vNewPos; // where light hits after refraction

    // indices of refraction
    const float IOR_AIR = 1.0;
    const float IOR_WATER = 1.333;

    // shoot a ray and find where it hits the floor plane
    vec3 projectToFloor(vec3 origin, vec3 ray) {
        float t = (uFloorY - origin.y) / ray.y;
        return origin + ray * t;
    }

    void main() {
        vec2 waterUV = uv;

        // sample water data: height and slope
        vec4 info = texture2D(uWaterTexture, waterUV);

        vec3 localPos = position;

        // flat water surface position in world space
        vec3 worldFlat = (modelMatrix * vec4(localPos, 1.0)).xyz;

        // "change" water using height from texture
        vec3 worldWater = worldFlat;
        worldWater.y += info.r;

        vec3 lightRay = -normalize(uLightDir);

        // find surface slope from texture (this was the best slope equation that i tested im not actually sure why
        // the other equations don't work as well)
        vec2 slope = info.ba * 2.0 - 1.0;
        vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));

        vec3 baseRay = refract(lightRay, vec3(0.0, 1.0, 0.0), 1.0 / 1.333); // uses snell's law :D air to water
        vec3 refractedRay = refract(lightRay, normal, 1.0 / 1.333); 

        // where light hits floor without waves
        vOldPos = projectToFloor(worldFlat, baseRay);
        // where light hits floor with waves
        vNewPos = projectToFloor(worldWater, refractedRay);

        // convert uv to clip space
        vec2 causticNDC = uv * 2.0 - 1.0;
        causticNDC.y *= -1.0; // flip y cuz screen space is inverted
        gl_Position = vec4(causticNDC, 0.0, 1.0);
}
`;

export const causticMeshFragmentShader = `
    precision highp float;

    uniform float uIntensity;
    varying vec3 vOldPos;
    varying vec3 vNewPos;

    void main() {
        float oldArea = length(cross(dFdx(vOldPos), dFdy(vOldPos))); // find area before refraction 
        float newArea = length(cross(dFdx(vNewPos), dFdy(vNewPos))); // find area after refraction
        float ratio = oldArea / max(newArea, 1e-7); // evan wallace's logic but basically new, smaller area = brighter

        float c = ratio;

        // threshold for low values
        c = max(c - 0.75, 0.0);
        // highlights
        c = pow(c, 2.6);

        // final caustic color
        vec3 baseGreen = vec3(0.58, 0.68, 0.22);
        gl_FragColor = vec4(baseGreen * c * uIntensity, 1.0);
}
`;