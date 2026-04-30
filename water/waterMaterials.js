import * as THREE from 'three';
import { waterVertexShader, waterFragShader, waterNormalDebugVertexShader, waterNormalDebugFragmentShader, dynamicWallVertexShader, dynamicWallFragmentShader } from './waterShaders.js';

export function createEnvTexture(scene) {
    const loader = new THREE.CubeTextureLoader();
    const envTexture = loader.load(
        [
            '/water/cubemap/xpos.jpg',
            '/water/cubemap/xneg.jpg',
            '/water/cubemap/ypos.jpg',
            '/water/cubemap/ypos.jpg',
            '/water/cubemap/zpos.jpg',
            '/water/cubemap/zneg.jpg'
        ],
        (texture) => {
            console.log('Cube texture loaded:', texture);
            console.log('images:', texture.image); // should be array of 6 -> double check later
            console.log('image count:', texture.image.length);
        },
        undefined,
        (err) => {
            console.error('Cube texture failed:', err);
        }
    );

    return envTexture;
}

export function createWaterMaterial(envTexture) {
    return new THREE.ShaderMaterial({
        uniforms: {
            heightmap: { value: null },
            uEnvMap: { value: envTexture },
            heightScale: { value: 3.0 },
            lightDir: { value: new THREE.Vector3(0.0, -1.0, 0.0) }
        },
        vertexShader: waterVertexShader,
        fragmentShader: waterFragShader,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
    });
}

export function createFloorMaterial() {
    return new THREE.MeshBasicMaterial({ color: 0xffffff });
}

export const waterNormalDebugMaterial = new THREE.ShaderMaterial({
    uniforms: {
        heightmap: { value: null },
        texel: { value: new THREE.Vector2(1 / 256, 1 / 256) },
        strength: { value: 10.0 },
    },
    vertexShader: waterNormalDebugVertexShader,
    fragmentShader: waterNormalDebugFragmentShader
});

export function createDynamicWallMaterial(envTexture) {
    return new THREE.ShaderMaterial({
        uniforms: {
            heightmap: { value: null },
            uEnvMap: { value: envTexture },
            heightScale: { value: 3.0 },
            waterSize: { value: 5.0 },
            waterY: { value: 0.0 },
            floorY: { value: -2.65 },
            side: { value: 0 },
            lightDir: { value: new THREE.Vector3(0.0, -1.0, 0.0) }
        },
        vertexShader: dynamicWallVertexShader,
        fragmentShader: dynamicWallFragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
    });
}