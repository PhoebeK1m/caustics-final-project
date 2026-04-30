import * as THREE from "three";
import { causticVertexShader, receiveCausticMaterialFragmentShader, causticMeshVertexShader, causticMeshFragmentShader } from "./causticShaders.js";

export const getReceiveCausticMaterial = () => {
    const material = new THREE.ShaderMaterial({
        uniforms: {
        uCausticTexture: { value: null },
        uCausticMatrix: { value: new THREE.Matrix4() },
        uBaseColor: { value: new THREE.Color("#000000") },
        uCausticStrength: { value: 5.0 },
        },
        vertexShader: causticVertexShader,
        fragmentShader: receiveCausticMaterialFragmentShader,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
        transparent: false,
    });

    material.uniforms.uCausticTexture.value = null;

    return material;
};

export const causticMeshMaterial = new THREE.ShaderMaterial({
    vertexShader: causticMeshVertexShader,
    fragmentShader: causticMeshFragmentShader,
    uniforms: {
        uWaterTexture: { value: null },
        uLightDir: { value: new THREE.Vector3() },
        uWaterSize: { value: 5 },
        uFloorY: { value: 0 },
        uIntensity: { value: 1 },
    },
    depthWrite: false,
    depthTest: false,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
});