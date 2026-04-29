import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { simFragShader } from './waterShaders.js';

export function createWaterSimulation({ renderer, size }) {
    const gpu = new GPUComputationRenderer(size, size, renderer);

    const waterTex = gpu.createTexture();
    const data = waterTex.image.data;

    for (let i = 0; i < data.length; i += 4) {
        data[i + 0] = 0; 
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 1;
    }

    const waterVariable = gpu.addVariable('heightmap', simFragShader, waterTex);
    gpu.setVariableDependencies(waterVariable, [waterVariable]);

    waterVariable.material.uniforms.mouse = { value: new THREE.Vector2(999, 999) };
    waterVariable.material.uniforms.mouseSize = { value: 0.0012 };
    waterVariable.material.uniforms.viscosity = { value: 0.995 };
    waterVariable.material.uniforms.waveStrength = { value: 2.0 };
    waterVariable.material.uniforms.rippleStrength = { value: 0.0 };

    const gpuError = gpu.init();
    if (gpuError) console.error(gpuError);

    function disturbUv(uv, strength = 0.02, rippleSize = 0.0005) {
        waterVariable.material.uniforms.mouse.value.set(uv.x, uv.y);
        waterVariable.material.uniforms.rippleStrength.value = strength;
        waterVariable.material.uniforms.mouseSize.value = rippleSize;
    }

    function clearDisturbance() {
        waterVariable.material.uniforms.mouse.value.set(999, 999);
        waterVariable.material.uniforms.rippleStrength.value = 0.0;
    }

    function compute(iterations = 2) {
        gpu.compute();
        clearDisturbance();
        for (let i = 1; i < iterations; i++) {
            gpu.compute();
        }
    }

    function getHeightmapTexture() {
        return gpu.getCurrentRenderTarget(waterVariable).texture;
    }

    function sampleWaterHeight({ x, z, waterSize, waterMaterial }) {
        const uv = new THREE.Vector2(
            THREE.MathUtils.clamp((x / waterSize) + 0.5, 0, 1),
            THREE.MathUtils.clamp((z / waterSize) + 0.5, 0, 1)
        );

        const pixels = new Float32Array(4);
        const target = gpu.getCurrentRenderTarget(waterVariable);

        renderer.readRenderTargetPixels(
            target,
            Math.floor(uv.x * (size - 1)),
            Math.floor(uv.y * (size - 1)),
            1,
            1,
            pixels
        );

        return pixels[0] * waterMaterial.uniforms.heightScale.value * 0.35;
    }

    return {
        gpu,
        waterVariable,
        disturbUv,
        clearDisturbance,
        compute,
        getHeightmapTexture,
        sampleWaterHeight
    };
}