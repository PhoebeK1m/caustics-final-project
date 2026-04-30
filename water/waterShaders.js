export const simulationFragmentShader = `
    uniform vec2 mouse; // mouse pos in uv space
    uniform float mouseSize; // mouse ripple area
    uniform float viscosity; // damping amount -> lower values make waves fade faster
    uniform float waveStrength; // height differences push wave
    uniform float rippleStrength; // how much height to add
    uniform float slopeStrength; // scales the stored slope values

    void main() {
        // turn the screen space pos into uv coordinates
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // one pixel step in uv space
        vec2 texel = 1.0 / resolution.xy;

        // get current simulation data at this pixel
        // r stores height, g stores velocity, b/a store slope from the previous frame
        vec4 state = texture2D(heightmap, uv);

        float height = state.r;
        float velocity = state.g;

        // sample the height of the four neighboring pixels
        // used to figure out how much this pixel differs from its surroundings
        float heightLeft  = texture2D(heightmap, uv - vec2(texel.x, 0.0)).r;
        float heightRight = texture2D(heightmap, uv + vec2(texel.x, 0.0)).r;
        float heightDown  = texture2D(heightmap, uv - vec2(0.0, texel.y)).r;
        float heightUp    = texture2D(heightmap, uv + vec2(0.0, texel.y)).r;
        float neighborAverage = (heightLeft + heightRight + heightDown + heightUp) * 0.25;

        // push velocity based on the difference between curr pixel and its neighbors
        velocity += (neighborAverage - height) * waveStrength;

        // reduce velocity a little every frame so the water eventually calms down
        velocity *= viscosity;

        // move the height by the current velocity
        height += velocity;

        // disturb around the mouse
        float mouseDistance = distance(uv, mouse);
        float ripple = exp(-(mouseDistance * mouseDistance) / mouseSize) * rippleStrength;
        height += ripple;

        // calculate the local slope
        float slopeX = (heightLeft - heightRight) * slopeStrength;
        float slopeZ = (heightDown - heightUp) * slopeStrength;

        // save info into rgba texture :D
        // r = height, g = velocity, b = x slope, a = z slope
        gl_FragColor = vec4(height, velocity, slopeX, slopeZ);
    }
`;

export const waterVertexShader = `
    uniform sampler2D heightmap;
    uniform float heightScale;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
        vUv = uv;

        vec4 info = texture2D(heightmap, uv);

        vec3 pos = position;
        pos.y += info.r * heightScale;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const waterFragShader = `
    precision highp float;

    uniform sampler2D heightmap;
    uniform samplerCube uEnvMap;
    uniform vec3 lightDir;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    const float IOR_AIR = 1.0;
    const float IOR_WATER = 1.333;

    void main() {
        vec2 coord = vUv;
        vec4 info = texture2D(heightmap, coord);

        for (int i = 0; i < 5; i++) {
            coord += info.ba * 0.005;
            info = texture2D(heightmap, coord);
        }

        vec2 slope = info.ba;

        slope = clamp(slope, vec2(-0.999), vec2(0.999));

        float normalY = sqrt(max(0.0, 1.0 - dot(slope, slope)));
        vec3 normal = normalize(vec3(slope.x, normalY, slope.y));

        vec3 incomingRay = normalize(vWorldPos - cameraPosition);

        vec3 reflectedRay = reflect(incomingRay, normal);
        vec3 refractedRay = refract(incomingRay, normal, IOR_AIR / IOR_WATER);

        vec3 reflectedColor = textureCube(uEnvMap, reflectedRay).rgb;
        vec3 shallowWater = vec3(0.58, 0.68, 0.22);
        vec3 deepWater = vec3(0.20, 0.28, 0.06);
        vec3 refractedColor = mix(deepWater, shallowWater, 0.35);

        float fresnel = mix(
            0.25,
            1.0,
            pow(1.0 - max(dot(normal, -incomingRay), 0.0), 3.0)
        );

        vec3 color = mix(refractedColor, reflectedColor, fresnel);

        vec3 L = normalize(lightDir);
        float spec = pow(max(dot(reflect(-L, normal), -incomingRay), 0.0), 250.0);
        color += vec3(spec) * vec3(3.0, 2.4, 1.8);

        gl_FragColor = vec4(color, 0.72);
    }
`;

export const waterNormalDebugVertexShader = `
    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const waterNormalDebugFragmentShader = `
    precision highp float;

    varying vec2 vUv;
    uniform sampler2D heightmap;

    void main() {
        vec2 coord = vUv;
        vec4 info = texture2D(heightmap, coord);

        for (int i = 0; i < 5; i++) {
            coord += info.ba * 0.005;
            info = texture2D(heightmap, coord);
        }

        vec2 slope = clamp(info.ba, vec2(-0.999), vec2(0.999));
        float y = sqrt(max(0.0, 1.0 - dot(slope, slope)));

        vec3 n = normalize(vec3(slope.x, y, slope.y));

        gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
    }
`;

export const dynamicWallVertexShader = `
    uniform sampler2D heightmap;
    uniform float heightScale;
    uniform float waterY;
    uniform float floorY;
    uniform int side;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vWallFade;

    vec2 getEdgeUv(vec2 uv) {
        if (side == 0) {
            return vec2(1.0 - uv.x, 0.0);
        } else if (side == 1) {
            return vec2(0.0, 1.0 - uv.x); 
        } else if (side == 2) {
            return vec2(1.0 - uv.x, 1.0);
        }

        return vec2(1.0, uv.x);   
    }

    void main() {
        vUv = uv;

        vec2 edgeUv = getEdgeUv(uv);
        float h = texture2D(heightmap, edgeUv).r;

        float topY = waterY + h * heightScale;
        float finalY = mix(floorY, topY, uv.y);

        vec3 pos = position;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        worldPos.y = finalY;

        vWorldPos = worldPos.xyz;
        vWallFade = uv.y;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const dynamicWallFragmentShader = `
    precision highp float;

    uniform samplerCube uEnvMap;
    uniform vec3 lightDir;

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying float vWallFade;

    void main() {
        vec3 viewDir = normalize(vWorldPos - cameraPosition);

        vec3 wallNormal = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
        if (!gl_FrontFacing) {
            wallNormal *= -1.0;
        }

        vec3 reflectedRay = reflect(viewDir, wallNormal);
        vec3 reflectedColor = textureCube(uEnvMap, reflectedRay).rgb;

        vec3 deepWater = vec3(0.18, 0.26, 0.08);
        vec3 shallowWater = vec3(0.55, 0.68, 0.22);

        vec3 baseColor = mix(deepWater, shallowWater, vWallFade);
        vec3 color = mix(baseColor, reflectedColor, 0.05);

        vec3 L = normalize(lightDir);
        float spec = pow(max(dot(reflect(-L, wallNormal), -viewDir), 0.0), 120.0);
        color += vec3(spec) * vec3(1.5, 1.3, 1.0);

        float alpha = mix(0.45, 0.78, vWallFade);

        gl_FragColor = vec4(color, alpha);
    }
`;