import * as THREE from 'three';
import {
    createFloorMaterial,
    createWaterMaterial,
    createDynamicWallMaterial
} from './waterMaterials.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function getWaterUvFromWorld(x, z, waterSize) {
    return new THREE.Vector2(
        THREE.MathUtils.clamp((x / waterSize) + 0.5, 0, 1),
        THREE.MathUtils.clamp((z / waterSize) + 0.5, 0, 1)
    );
}

export function createWaterObjects({ scene, envTexture, size, waterSize }) {
    const halfWater = waterSize * 0.5;
    const waterMaterial = createWaterMaterial(envTexture);

    const geo = new THREE.PlaneGeometry(waterSize, waterSize, size - 1, size - 1);
    geo.rotateX(-Math.PI / 2);

    const water = new THREE.Mesh(geo, waterMaterial);
    scene.add(water);

    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(waterSize, waterSize),
        createFloorMaterial()
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.65;
    scene.add(floor);

    const wallHeight = 4;
    const wallSegments = size - 1;

    const wall1Material = createDynamicWallMaterial(envTexture);
    const wall2Material = createDynamicWallMaterial(envTexture);
    const wall3Material = createDynamicWallMaterial(envTexture);
    const wall4Material = createDynamicWallMaterial(envTexture);

    wall1Material.uniforms.side.value = 2;
    wall2Material.uniforms.side.value = 1;
    wall3Material.uniforms.side.value = 0;
    wall4Material.uniforms.side.value = 3;

    const wallGeo = new THREE.PlaneGeometry(
        waterSize,
        wallHeight,
        wallSegments,
        1
    );

    const wall1 = new THREE.Mesh(wallGeo, wall1Material);
    wall1.position.set(0, 0, -halfWater);
    wall1.rotation.y = Math.PI;
    scene.add(wall1);

    const wall2 = new THREE.Mesh(wallGeo.clone(), wall2Material);
    wall2.rotation.y = -Math.PI / 2;
    wall2.position.set(-halfWater, 0, 0);
    scene.add(wall2);

    const wall3 = new THREE.Mesh(wallGeo.clone(), wall3Material);
    wall3.rotation.y = -Math.PI;
    wall3.position.set(0, 0, halfWater);
    scene.add(wall3);

    const wall4 = new THREE.Mesh(wallGeo.clone(), wall4Material);
    wall4.rotation.y = Math.PI / 2;
    wall4.position.set(halfWater, 0, 0);
    scene.add(wall4);

    const ballRadius = 0.35;
    const ball = new THREE.Group();

    ball.position.set(0, ballRadius + 0.12, 0);
    scene.add(ball);

    const loader = new GLTFLoader();

    loader.load(
        '/models/pickle.glb',
        (gltf) => {
            const pickle = gltf.scene;

            // pickle.scale.set(0.3, 0.3, 0.3);

            // local offset inside the movable group
            pickle.position.set(0, 0, 0);

            ball.add(pickle);
        },
        undefined,
        (error) => {
            console.error('Error loading pickle:', error);
        }
    );

    return {
        water,
        waterMaterial,
        floor,
        wall1,
        wall2,
        wall3,
        wall4,
        ball,
        ballRadius
    };
}
