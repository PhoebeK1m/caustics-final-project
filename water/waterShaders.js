export const simFragShader = `
    uniform vec2 mouse;
    uniform float mouseSize;
    uniform float viscosity;
    uniform float waveStrength;
    uniform float rippleStrength;

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

        gl_FragColor = vec4(height, velocity, 0.0, 1.0);
    }
`;

export const waterVertexShader = `
    uniform sampler2D heightmap;
    uniform float heightScale;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
    vUv = uv;

    float h = texture2D(heightmap, uv).r;

    vec3 pos = position;
    pos.y += h * heightScale;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const waterFragShader = `
    uniform sampler2D heightmap;
    uniform samplerCube uEnvMap;
    uniform vec3 lightDir;

    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
    vec2 texel = vec2(1.0 / 256.0);

    float hL = texture2D(heightmap, vUv - vec2(texel.x, 0.0)).r;
    float hR = texture2D(heightmap, vUv + vec2(texel.x, 0.0)).r;
    float hD = texture2D(heightmap, vUv - vec2(0.0, texel.y)).r;
    float hU = texture2D(heightmap, vUv + vec2(0.0, texel.y)).r;

    vec3 normal = normalize(vec3((hL - hR) * 3.0, 1.0, (hD - hU) * 3.0));

    vec3 viewDir = normalize(vWorldPos - cameraPosition);
    vec3 reflected = reflect(viewDir, normal);
    vec3 reflectionColor = textureCube(uEnvMap, reflected).rgb;

    float fresnel = pow(1.0 - max(dot(-viewDir, normal), 0.0), 3.0);

    vec3 waterTint = vec3(0.01, 0.18, 0.24);
    vec3 color = mix(waterTint, reflectionColor, 0.25 + fresnel * 0.45);

    vec3 L = normalize(lightDir);
    float spec = pow(max(dot(reflect(-L, normal), -viewDir), 0.0), 80.0);
    color += vec3(spec) * 1.5;

    gl_FragColor = vec4(color, 0.38);
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
    uniform vec2 texel;
    uniform float strength;

    void main() {
        float hL = texture2D(heightmap, vUv - vec2(texel.x, 0.0)).r;
        float hR = texture2D(heightmap, vUv + vec2(texel.x, 0.0)).r;
        float hD = texture2D(heightmap, vUv - vec2(0.0, texel.y)).r;
        float hU = texture2D(heightmap, vUv + vec2(0.0, texel.y)).r;

        vec3 n = normalize(vec3(
            (hL - hR) * strength,   // X slope
            (hD - hU) * strength,   // Y slope
            1.0                     // Z is up
        ));

        gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
    }`
;