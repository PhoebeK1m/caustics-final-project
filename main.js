import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { normalCamera, normalRenderTarget, normalMaterial, normalPlane } from './rendertarget/normalRenderTargets.js';
import { causticRenderTarget, causticPlane, receiveCausticMaterial } from './rendertarget/causticRenderTargets.js';
import { createEnvTexture, waterNormalDebugMaterial } from './water/waterMaterials.js';
import { createWaterSimulation } from './water/waterMovement.js';
import { createWaterObjects } from './water/waterObject.js';
import { createWaterBallController } from './water/waterSimulation.js';
import { causticMeshMaterial, getReceiveCausticMaterial } from './caustic/causticMaterials.js';

// gui code and global parameters
const gui = new GUI();

let gui_params = {
	showNormalPlane: false,
    showCausticPlane: false,
    intensity: 0.5,
};

gui.add(gui_params, 'showNormalPlane');
gui.add(gui_params, 'showCausticPlane');
gui.add(gui_params, 'intensity', 0, 10);

// scene objects and materials
const meshesToRender = new Map(); // contributes to caustic
const meshMaterials = new Map(); // all materials
const meshesToNotRender = new Map(); // does not contribute to caustics
const sceneMesh = new Map(); // receives caustic texture

// set up webgl/three scene
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
const sizes = { width: window.innerWidth, height: window.innerHeight };
const camera = new THREE.PerspectiveCamera(65, sizes.width / sizes.height, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 5;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sizes.width, sizes.height);

// camera controls
const controls = new OrbitControls(camera, canvas);
controls.minDistance = 6; 
controls.maxDistance = 20;
controls.enableDamping = true;

// cube map
const envTexture = createEnvTexture(scene);

// normal preview plane
camera.add(normalPlane);
// caustic preview plane
camera.add(causticPlane);
scene.add(camera);

// scene lights
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(3, 6, 4);
scene.add(sun);

// spot light -> "the light space"
const spotLight = new THREE.SpotLight(0xffffff, 100); 
spotLight.position.set(0, 5, 0);
spotLight.penumbra = 0.5;
spotLight.decay = 2;
scene.add(spotLight);

// water simulation function
const SIZE = 256;
const WATERSIZE = 5;
const waterSim = createWaterSimulation({ renderer, size: SIZE });
// water simulation objects
const {
    water,
    waterMaterial,
    floor,
    wall1,
    wall2,
    wall3,
    wall4,
    ball, // i had it originally as a ball but changed the mesh to a pickle : )
    ballRadius,
    pickleRef
} = createWaterObjects({
    scene,
    envTexture,
    size: SIZE,
    waterSize: WATERSIZE
});
// add objects to respective dictionaries
meshesToRender.set("water", water);
meshMaterials.set("water", waterMaterial);
meshesToNotRender.set("ball", ball);
sceneMesh.set("floor", floor);
meshesToNotRender.set("wall1", wall1);
meshesToNotRender.set("wall2", wall2);
meshesToNotRender.set("wall3", wall3);
meshesToNotRender.set("wall4", wall4);

const waterBall = createWaterBallController({
    renderer,
    camera,
    controls,
    water,
    ball,
    ballRadius,
    waterSim,
    waterMaterial,
    waterSize: WATERSIZE
});

//animation loop
const tick = () => {
    // update water simulation
    waterSim.compute();
    const heightmapTexture = waterSim.getHeightmapTexture();
    water.material.uniforms.heightmap.value = heightmapTexture;
    for (const wall of [wall1, wall2, wall3, wall4]) {
        wall.material.uniforms.heightmap.value = heightmapTexture;
        wall.material.uniforms.waterSize.value = 5;
        wall.material.uniforms.waterY.value = water.position.y;
        wall.material.uniforms.floorY.value = floor.position.y;
    }
    waterBall.update();

    // update controls for damping camera movement
    controls.update();

    // update light camera position with light
    normalCamera.position.copy(spotLight.position);
    normalCamera.lookAt(floor.position);

    // normal render
    // use normals for material
    for (const [name, mesh] of meshesToRender) {
        if (!mesh) {
            console.warn(`Missing mesh for ${name}`);
            continue;
        }
        if (name === "water") {
            mesh.material = waterNormalDebugMaterial;
        } else {
            mesh.material = normalMaterial;
            mesh.material.side = THREE.BackSide;
        }
    }
    // make invisible for preview
    for (const [name, mesh] of meshesToNotRender) {
        mesh.visible = false;
    }
    for (const [name, mesh] of sceneMesh) {
        mesh.visible = false;
    }
    waterNormalDebugMaterial.uniforms.heightmap.value = waterSim.getHeightmapTexture();
    // change fbo
    renderer.setRenderTarget(normalRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    // render normals preview
    renderer.render(scene, normalCamera);
    
    // reset to original material
    for (const [name, mesh] of meshesToRender) {
        mesh.material = meshMaterials.get(name);
    }
    // make visible again
    for (const [name, mesh] of sceneMesh) {
        mesh.visible = true;
    }
    for (const [name, mesh] of meshesToNotRender) {
        mesh.visible = true;
    }

    // render caustic texture
    water.material = causticMeshMaterial;
    causticMeshMaterial.uniforms.uWaterTexture.value = heightmapTexture;
    const lightDir = spotLight.position.clone().sub(water.position).normalize();
    causticMeshMaterial.uniforms.uLightDir.value = lightDir;
    causticMeshMaterial.uniforms.uWaterSize.value = WATERSIZE;
    causticMeshMaterial.uniforms.uFloorY.value = floor.position.y;
    causticMeshMaterial.uniforms.uIntensity.value = gui_params.intensity;
    renderer.setRenderTarget(causticRenderTarget);
    renderer.setClearColor(0x28301c, 1); // set clear color to pickle brine color
    renderer.clear();
    renderer.render(water, normalCamera);
    water.material = meshMaterials.get("water"); // reset water

    // set floor material uniforms
    receiveCausticMaterial.uniforms.uCausticTexture.value = causticRenderTarget.texture;
    receiveCausticMaterial.uniforms.uCausticStrength.value = gui_params.intensity;
    receiveCausticMaterial.uniforms.uWaterCenter.value.copy(water.position);
    receiveCausticMaterial.uniforms.uWaterSize.value = WATERSIZE;

    // set floor to receive caustic
    for (const [name, mesh] of sceneMesh) {
        mesh.material = receiveCausticMaterial;
    }

    // previews visibility
    normalPlane.visible = gui_params.showNormalPlane;
    causticPlane.visible = gui_params.showCausticPlane;

    // render full scene
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x7ea1bf, 1);
    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();