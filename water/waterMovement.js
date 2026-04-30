import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { simulationFragmentShader } from './waterShaders.js';

export function createWaterSimulation({ renderer, size }) {
    // create the gpu computation system (basically runs shaders like a simulation)
    const gpu = new GPUComputationRenderer(size, size, renderer);

    // make a texture that will store the water data (height, velocity, slopes)
    const waterTex = gpu.createTexture();
    const data = waterTex.image.data;

    // initialize all pixels to 0 (flat water, no movement)
    for (let i = 0; i < data.length; i += 4) {
        data[i + 0] = 0; // height
        data[i + 1] = 0; // velocity
        data[i + 2] = 0; // slope x
        data[i + 3] = 0; // slope z
    }

    // create a gpu variable that runs the simulation shader on the texture
    const waterVariable = gpu.addVariable('heightmap', simulationFragmentShader, waterTex);

    // feedback loop for simulation
    gpu.setVariableDependencies(waterVariable, [waterVariable]);

    waterVariable.material.uniforms.mouse = { value: new THREE.Vector2(999, 999) }; // offscreen by default
    waterVariable.material.uniforms.mouseSize = { value: 0.0012 };
    waterVariable.material.uniforms.viscosity = { value: 0.995 };
    waterVariable.material.uniforms.waveStrength = { value: 2.0 };
    waterVariable.material.uniforms.rippleStrength = { value: 0.0 }; // zero here but 0.02 on disturb
    waterVariable.material.uniforms.slopeStrength = { value: 15.0 };

    const gpuError = gpu.init();
    if (gpuError){
        console.error(gpuError); // log if something broke
    }

    // create a ripple at a specific uv coordinate
    function disturbUv(uv, strength = 0.02, rippleSize = 0.0005) {
        waterVariable.material.uniforms.mouse.value.set(uv.x, uv.y);
        waterVariable.material.uniforms.rippleStrength.value = strength;
        waterVariable.material.uniforms.mouseSize.value = rippleSize;
    }

    // reset disturbance so it doesn't keep triggering every frame
    function clearDisturbance() {
        waterVariable.material.uniforms.mouse.value.set(999, 999);
        waterVariable.material.uniforms.rippleStrength.value = 0.0;
    }

    // run the simulation step
    function compute(iterations = 2) {
        // first pass -> applies disturbance if any
        gpu.compute();
        clearDisturbance();

        // run extra iterations to stabalize
        for (let i = 1; i < iterations; i++) {
            gpu.compute();
        }
    }

    // get the current heightmap texture
    function getHeightmapTexture() {
        return gpu.getCurrentRenderTarget(waterVariable).texture;
    }

    // sample the water height at a world pos
    function sampleWaterHeight({ x, z, waterSize, waterMaterial }) {
        // convert world pos to uv space
        const uv = new THREE.Vector2(
            THREE.MathUtils.clamp((x / waterSize) + 0.5, 0, 1),
            THREE.MathUtils.clamp((z / waterSize) + 0.5, 0, 1)
        );

        const pixels = new Float32Array(4);
        // get the current render target from gpu
        const target = gpu.getCurrentRenderTarget(waterVariable);
        // read a single pixel from the gpu texture at the uv pos
        renderer.readRenderTargetPixels(
            target,
            Math.floor(uv.x * (size - 1)),
            Math.floor(uv.y * (size - 1)),
            1,
            1,
            pixels
        );

        // return height scaled by material settings (only using red)
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