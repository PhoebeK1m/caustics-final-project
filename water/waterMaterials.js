import * as THREE from 'three';
import { waterVertexShader, waterFragShader, waterNormalDebugVertexShader, waterNormalDebugFragmentShader } from './waterShaders.js';

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
            console.log('images:', texture.image); // should be array of 6
            console.log('image count:', texture.image.length);
            scene.background = new THREE.Color(0x4387f5);
            scene.environment = texture;
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
        lightDir: { value: new THREE.Vector3(0.4, 1.0, 0.3) }
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

export function createWallMaterial() {
    return new THREE.MeshBasicMaterial({
        color: 0xffffff,
    });
}

export function createBallMaterial(envTexture) {
    return new THREE.MeshStandardMaterial({
        color: 0xff8844,
        roughness: 0.25,
        metalness: 0.05,
        envMap: envTexture,
        envMapIntensity: 0.5
    });
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