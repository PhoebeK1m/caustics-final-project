import * as THREE from 'three';
import { createFloorMaterial, createWaterMaterial, createDynamicWallMaterial } from './waterMaterials.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// go from world xz position to water uv space (aka 0 to 1)
export function getWaterUVFromWorld(x, z, waterSize) {
    return new THREE.Vector2(
        THREE.MathUtils.clamp((x / waterSize) + 0.5, 0, 1),
        THREE.MathUtils.clamp((z / waterSize) + 0.5, 0, 1)
    );
}

export function createWaterObjects({ scene, envTexture, size, waterSize }) {
    const halfWater = waterSize * 0.5;
    const waterMaterial = createWaterMaterial(envTexture);

    // create water
    const waterPlaneGeometry = new THREE.PlaneGeometry(waterSize, waterSize, size - 1, size - 1);
    waterPlaneGeometry.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterPlaneGeometry, waterMaterial);
    scene.add(water);

    // create floor
    const floorPlaneGeometry = new THREE.PlaneGeometry(waterSize, waterSize);
    const floor = new THREE.Mesh(floorPlaneGeometry, createFloorMaterial());
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.65;
    scene.add(floor);

    // create water walls
    const wallHeight = 4;
    const wallSegments = size - 1;
    // create 4 materials that reacts differently to heightmap
    const wall1Material = createDynamicWallMaterial(envTexture);
    const wall2Material = createDynamicWallMaterial(envTexture);
    const wall3Material = createDynamicWallMaterial(envTexture);
    const wall4Material = createDynamicWallMaterial(envTexture);
    // which shader side is which wall -> also honestly did not match the first time so i plugged and guessed
    wall1Material.uniforms.side.value = 2;
    wall2Material.uniforms.side.value = 1;
    wall3Material.uniforms.side.value = 0;
    wall4Material.uniforms.side.value = 3;
    // shared geometry for all walls (a vertical plane)
    const wallGeometry = new THREE.PlaneGeometry(waterSize, wallHeight, wallSegments, 1);
    // actually create walls
    const wall1 = new THREE.Mesh(wallGeometry, wall1Material);
    wall1.position.set(0, 0, -halfWater);
    wall1.rotation.y = Math.PI; // face inward
    scene.add(wall1);
    const wall2 = new THREE.Mesh(wallGeometry.clone(), wall2Material);
    wall2.rotation.y = -Math.PI / 2;
    wall2.position.set(-halfWater, 0, 0);
    scene.add(wall2);
    const wall3 = new THREE.Mesh(wallGeometry.clone(), wall3Material);
    wall3.rotation.y = -Math.PI;
    wall3.position.set(0, 0, halfWater);
    scene.add(wall3);
    const wall4 = new THREE.Mesh(wallGeometry.clone(), wall4Material);
    wall4.rotation.y = Math.PI / 2;
    wall4.position.set(halfWater, 0, 0);
    scene.add(wall4);

    // create floating object group
    const ballRadius = 0.35;
    const ball = new THREE.Group();
    ball.position.set(0, ballRadius + 0.12, 0);
    scene.add(ball);

    // references to the pickle and its meshes (for once its loaded)
    const pickleRef = {
        root: null,
        meshes: [],
        originalMaterials: new Map()
    };

    const loader = new GLTFLoader();

    // load the pickle model
    loader.load(
        '/models/pickle.glb',
        (gltf) => {
            const pickle = gltf.scene;
            // position pickle relative to the ball
            pickle.position.set(0, 0, 0);
            // go through all children and get pickle mesh
            pickle.traverse((child) => {
                if (child.isMesh) {
                    pickleRef.meshes.push(child);
                    pickleRef.originalMaterials.set(child, child.material);
                }
            });
            pickleRef.root = pickle;
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
        ballRadius,
        pickleRef
    };
}