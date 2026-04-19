export const causticVertexShader = `
    // precision mediump float;
    varying vec2 vUV;
    varying vec3 vPos;

    void main() {
        vUV = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`;

export const causticFragmentShader = `
    // precision mediump float;
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
        vec3 ray = refract(lightDir, normal, 1.0/1.25);

        vec3 newPos = vPos.xyz + ray;
        vec3 oldPos = vPos.xyz;

        float oldArea = length(dFdx(oldPos)) * length(dFdy(oldPos));
        float newArea = length(dFdx(newPos)) * length(dFdy(newPos));

        float color = oldArea / newArea;
        float scale = clamp(color, 0.0, 1.0) * uIntensity;
        scale = pow(scale, 4.0);

        gl_FragColor = vec4(vec3(scale), 1.0);
    }
`;
