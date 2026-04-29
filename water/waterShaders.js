export const simFragShader = `
    uniform vec2 mouse;
    uniform float mouseSize;
    uniform float viscosity;
    uniform float waveStrength;
    uniform float rippleStrength;
    uniform float slopeStrength;

    void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;
        vec2 texel = 1.0 / resolution.xy;

        vec4 current = texture2D(heightmap, uv);

        float height = current.r;
        float velocity = current.g;

        float hL = texture2D(heightmap, uv - vec2(texel.x, 0.0)).r;
        float hR = texture2D(heightmap, uv + vec2(texel.x, 0.0)).r;
        float hD = texture2D(heightmap, uv - vec2(0.0, texel.y)).r;
        float hU = texture2D(heightmap, uv + vec2(0.0, texel.y)).r;

        float average = (hL + hR + hD + hU) * 0.25;

        velocity += (average - height) * waveStrength;
        velocity *= viscosity;
        height += velocity;

        float d = distance(uv, mouse);
        height += exp(-d * d / mouseSize) * rippleStrength;

        float slopeX = (hL - hR) * slopeStrength;
        float slopeZ = (hD - hU) * slopeStrength;

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
        vec3 shallowWater = vec3(0.12, 0.75, 0.95);
        vec3 deepWater = vec3(0.01, 0.18, 0.24);
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