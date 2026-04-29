import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { torusknot, torusmaterial, loadJuice, juicematerial } from "./objects.js";
import { normalCamera, normalRenderTarget, normalMaterial, normalPlane } from './rendertarget/normalRenderTargets.js';
import { causticRenderTarget, causticMap, causticQuad, causticPlane, receiveCausticMaterial } from './rendertarget/causticRenderTargets.js';
import { depthRenderTarget, depthMaterial, depthPlane } from './rendertarget/depthRenderTargets.js';
import { createEnvTexture, waterNormalDebugMaterial } from './water/waterMaterials.js';
import { createWaterSimulation } from './water/waterMovement.js';
import { createWaterObjects } from './water/waterObject.js';
import { createWaterBallController } from './water/waterSimulation.js';

// gui code and global parameters
const gui = new GUI();

let gui_params = {
	showNormalPlane: true,
    showCausticPlane: true,
    showDepthPlane: true,
    showWater: false,
    showChromatic: true,
    intensity: 0.5,
    chromaticAberration: 0.03,
};

gui.add(gui_params, 'showNormalPlane');
gui.add(gui_params, 'showCausticPlane');
gui.add(gui_params, 'showDepthPlane');
gui.add(gui_params, 'showWater');
gui.add(gui_params, 'showChromatic');
gui.add(gui_params, 'intensity', 0, 3);
gui.add(gui_params, 'chromaticAberration', 0, 3);

// scene objects and materials
const meshesToRender = new Map();
const meshMaterials = new Map();
const meshesToNotRender = new Map();
const sceneMesh = new Map();

// set up webgl/three scene
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};
const camera = new THREE.PerspectiveCamera(65, sizes.width / sizes.height, 0.1, 1000);
camera.position.z = 10; // set camera infront of object

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sizes.width, sizes.height);

// camera movement
const controls = new OrbitControls(camera, canvas);
controls.minDistance = 10; 
controls.maxDistance = 20;
// controls.enableZoom = false; 
controls.enableDamping = true;

const envTexture = createEnvTexture(scene);

// normal plane
camera.add(normalPlane);
// caustics plane
camera.add(causticPlane);
//depth plane 
camera.add(depthPlane);
scene.add(camera);

// scene lights
scene.add(new THREE.HemisphereLight(0xffffff, 0x224466, 1.2));

const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(3, 6, 4);
scene.add(sun);

// spot light
const spotLight = new THREE.SpotLight(0xffffff, 100); 
spotLight.position.set(0, 5, 0);
spotLight.penumbra = 0.5;
spotLight.decay = 2;
scene.add(spotLight);

const waterSim = createWaterSimulation({ renderer, size: 256 });
const {
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
} = createWaterObjects({
    scene,
    envTexture,
    size: 256,
    waterSize: 10
});
meshesToRender.set("water", water);
meshMaterials.set("water", waterMaterial);
meshesToNotRender.set("ball", ball);
wall1.visible = false;
wall2.visible = false;
wall3.visible = false;
wall4.visible = false;
floor.material = depthMaterial;
sceneMesh.set("floor", floor);
scene.add(torusknot);
meshesToRender.set("torus", torusknot);
meshMaterials.set("torus", torusmaterial);

const waterBall = createWaterBallController({
    renderer,
    camera,
    controls,
    water,
    ball,
    ballRadius,
    waterSim,
    waterMaterial,
    waterSize: 10
});

//animation loop
const tick = () => {
    waterSim.compute();
    water.material.uniforms.heightmap.value = waterSim.getHeightmapTexture();
    waterBall.update();

    // update controls for damping camera movement
    controls.update();
    normalPlane.visible = false;
    causticPlane.visible = false;
    depthPlane.visible = false;

    // render
    // update camera position with light
    normalCamera.position.copy(spotLight.position);
    normalCamera.lookAt(floor.position);

    // use normals for material
    // for (let i = 0; i < meshesToRender.length; i++) {
    for (const [name, mesh] of meshesToRender) {
        if (!mesh) {
            console.warn(`Missing mesh for ${name}`);
            continue;
        }
        if (name === "water") {
            mesh.material = waterNormalDebugMaterial;
            mesh.visible = gui_params.showWater;
        } else {
            mesh.material = normalMaterial;
            mesh.material.side = THREE.BackSide;
        }
    }
    for (const [name, mesh] of meshesToNotRender) {
        mesh.visible = false;
    }
    for (const [name, mesh] of sceneMesh) {
        mesh.visible = false;
    }
    
    // change fbo
    renderer.setRenderTarget(normalRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    // render normals scene
    renderer.render(scene, normalCamera);
    waterNormalDebugMaterial.uniforms.heightmap.value = waterSim.getHeightmapTexture();
    
    // set back to original material
    for (const [name, mesh] of meshesToRender) {
        mesh.material = meshMaterials.get(name);
    }

    // render receiver depth from light view
    for (const [name, mesh] of meshesToRender) {
        mesh.visible = false;
    }
    for (const [name, mesh] of sceneMesh) {
        mesh.visible = true;
        mesh.material = depthMaterial;
    }
    renderer.setRenderTarget(depthRenderTarget);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, normalCamera);
    // restore
    for (const [name, mesh] of meshesToRender) { 
        mesh.visible = true;
        if (name === "water") {
            mesh.visible = gui_params.showWater;
        }
    };
    for (const [name, mesh] of meshesToNotRender) {
        mesh.visible = true;
    }

    // render caustics
    causticQuad.material = causticMap;
    causticQuad.material.uniforms.uTexture.value = normalRenderTarget.texture;
    causticQuad.material.uniforms.uDepthTexture.value = depthRenderTarget.texture;

    causticQuad.material.uniforms.uLight.value = spotLight.position;
    causticQuad.material.uniforms.uIntensity.value = gui_params.intensity;

    causticQuad.material.uniforms.uLightMatrix.value
        .multiplyMatrices(normalCamera.projectionMatrix, normalCamera.matrixWorldInverse);

    // put fbo onto plane
    renderer.setRenderTarget(causticRenderTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    // by using the quads (actually 2 triangles) to find caustics (using area)
    causticQuad.render(renderer);
    causticPlane.material.uniforms.uTexture.value = causticRenderTarget.texture;
    causticPlane.material.uniforms.uAberration.value = gui_params.chromaticAberration;
    causticPlane.material.uniforms.uChromatic.value = gui_params.showChromatic;

    // after setting receiveCausticMaterial uniforms
    receiveCausticMaterial.uniforms.uCausticTexture.value = causticRenderTarget.texture;
    receiveCausticMaterial.uniforms.uCausticMatrix.value.copy(
    new THREE.Matrix4().multiplyMatrices(
        normalCamera.projectionMatrix,
        normalCamera.matrixWorldInverse
    )
    );
    receiveCausticMaterial.uniforms.uCausticStrength.value = gui_params.intensity * 10;
    floor.material = receiveCausticMaterial;

    normalPlane.visible = gui_params.showNormalPlane;
    causticPlane.visible = gui_params.showCausticPlane;
    depthPlane.visible = gui_params.showDepthPlane;

    renderer.setRenderTarget(null);
    renderer.setClearColor(0x7ea1bf, 1);
    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();