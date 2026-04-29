import * as THREE from "three";
import { causticVertexShader, causticMapFragmentShader, causticMaterialFragmentShader, receiveCausticMaterialFragmentShader } from "./shaders.js";

export const getCausticMap = () => {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: null },
            uLight: { value: new THREE.Vector3(0, 0, 0) },
            uIntensity: { value: 1.0 },
            uDepthTexture: { value: null },
            uLightMatrix: { value: new THREE.Matrix4() },
            uRayMaxDistance: { value: 20.0 },
            uDepthBias: { value: 0.001 },
        },
        vertexShader: causticVertexShader,
        fragmentShader: causticMapFragmentShader
    });
};

export const getCausticMaterial = () => {
    return new THREE.ShaderMaterial({
        uniforms: {
            uLight: { value: new THREE.Vector3(0, 0, 0) },
            uTexture: { value: null },
            uAberration: { value: 0.02 },
            uChromatic: { value: true }
        },
        vertexShader: causticVertexShader,
        fragmentShader: causticMaterialFragmentShader,
        transparent: true,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.SrcAlphaFactor,
        // blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
};

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