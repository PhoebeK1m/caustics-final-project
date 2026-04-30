import * as THREE from 'three';
import { createBallMaterial, createFloorMaterial, createWallMaterial, createWaterMaterial } from './waterMaterials.js';

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

    const wallMaterial = createWallMaterial();

    const wall1 = new THREE.Mesh(new THREE.PlaneGeometry(waterSize, 4), wallMaterial);
    wall1.position.set(0, -0.65, -halfWater);
    scene.add(wall1);

    const wall2 = new THREE.Mesh(new THREE.PlaneGeometry(waterSize, 4), wallMaterial);
    wall2.rotation.y = Math.PI / 2;
    wall2.position.set(-halfWater, -0.65, 0);
    scene.add(wall2);

    const wall3 = new THREE.Mesh(new THREE.PlaneGeometry(waterSize, 4), wallMaterial);
    wall3.rotation.y = -Math.PI;
    wall3.position.set(0, -0.65, halfWater);
    scene.add(wall3);

    const wall4 = new THREE.Mesh(new THREE.PlaneGeometry(waterSize, 4), wallMaterial);
    wall4.rotation.y = -Math.PI / 2;
    wall4.position.set(halfWater, -0.65, 0);
    scene.add(wall4);

    const ballRadius = 0.35;
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(ballRadius, 48, 32),
        createBallMaterial(envTexture)
    );

    ball.position.set(0, ballRadius + 0.12, 0);
    scene.add(ball);

    return {
        water,
        waterMaterial,
        floor,
        wall1,
        wall2,
        wall3,
        wall4,
        wallMaterial,
        ball,
        ballRadius
    };
}
