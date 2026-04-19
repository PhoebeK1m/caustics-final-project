import * as THREE from "three";
import { causticVertexShader, causticMapFragmentShader, causticMaterialFragmentShader } from "./shaders.js";

export const getCausticMap = () => {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: null },
            uLight: { value: new THREE.Vector3(0, 0, 0) },
            uIntensity: { value: 1.0 },
        },
        vertexShader: causticVertexShader,
        fragmentShader: causticMapFragmentShader
    });
};

export const getCausticMaterial = () => {
    return new THREE.ShaderMaterial({
        uniforms: {
            uLight: { value: new THREE.Vector2(0, 0, 0) },
            uTexture: { value: null },
            uAberration: { value: 0.02 },
        },
        vertexShader: causticVertexShader,
        fragmentShader: causticMaterialFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide 
    });
};