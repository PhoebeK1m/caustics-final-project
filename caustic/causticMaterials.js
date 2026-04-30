import * as THREE from "three";
import { causticVertexShader, receiveCausticMaterialFragmentShader, causticMeshVertexShader, causticMeshFragmentShader } from "./causticShaders.js";

export const getReceiveCausticMaterial = () => {
    const material = new THREE.ShaderMaterial({
        uniforms: {
            uCausticTexture: { value: null },
            uBaseColor: { value: new THREE.Color("#000000") },
            uCausticStrength: { value: 0 },
            uWaterCenter: { value: new THREE.Vector3() },
            uWaterSize: { value: 5 },
        },
        vertexShader: causticVertexShader,
        fragmentShader: receiveCausticMaterialFragmentShader,
        depthWrite: true,
        depthTest: true,
        transparent: false,
        side: THREE.DoubleSide,
    });

    return material;
};

export const causticMeshMaterial = new THREE.ShaderMaterial({
    vertexShader: causticMeshVertexShader,
    fragmentShader: causticMeshFragmentShader,
    uniforms: {
        uWaterTexture: { value: null },
        uLightDir: { value: new THREE.Vector3(0, -1, 0) },
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