import * as THREE from "three";
import { causticVertexShader, causticFragmentShader } from "./shaders.js";

export const getCausticMaterial = (initTexture, initialLightPos, initialIntensity) => {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: null },
            uLight: { value: new THREE.Vector3(0, 0, 0) },
            uIntensity: { value: 1.0 },
        },
        vertexShader: causticVertexShader,
        fragmentShader: causticFragmentShader
    });
};