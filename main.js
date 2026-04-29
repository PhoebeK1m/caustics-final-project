import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { torusknot, torusmaterial, loadJuice, juicematerial } from "./objects.js";
import { normalCamera, normalRenderTarget, normalMaterial, normalPlane } from './rendertarget/normalRenderTargets.js';
import { causticRenderTarget, causticMap, causticQuad, causticPlane, receiveCausticMaterial } from './rendertarget/causticRenderTargets.js';
import { depthRenderTarget, depthMaterial, depthPlane } from './rendertarget/depthRenderTargets.js';

// gui code and global parameters
const gui = new GUI();

let gui_params = {
	showNormalPlane: false,
    showCausticPlane: false,
    showDepthPlane: false,
    showJuice: false,
    showKnot: true,
    showChromatic: true,
    intensity: 0.5,
    chromaticAberration: 0.03,
};

gui.add(gui_params, 'showNormalPlane');
gui.add(gui_params, 'showCausticPlane');
gui.add(gui_params, 'showDepthPlane');
gui.add(gui_params, 'showJuice');
gui.add(gui_params, 'showKnot');
gui.add(gui_params, 'showChromatic');
gui.add(gui_params, 'intensity', 0, 3);
gui.add(gui_params, 'chromaticAberration', 0, 3);

// scene objects and materials
const meshesToRender = new Map();
const meshMaterials = new Map();

// set up webgl/three scene
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
};
const camera = new THREE.PerspectiveCamera(65, sizes.width / sizes.height, 0.1, 1000);
camera.position.z = 10; // set camera infront of object

// set render window half of screen
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(sizes.width, sizes.height);

// camera movement
const controls = new OrbitControls(camera, canvas);
const fixedRadius = 10;
controls.minDistance = fixedRadius; // drag rotates and translate camera around target
controls.maxDistance = fixedRadius;
controls.enableZoom = false; 
controls.enableDamping = true;

// geometry
scene.add(torusknot);
meshesToRender.set("torus", torusknot);
meshMaterials.set("torus", torusmaterial);
const loadingJuice = await loadJuice(juicematerial);
const {juice, juicemesh} = loadingJuice;
scene.add(juice);
meshesToRender.set("juice", juicemesh);
meshMaterials.set("juice", juicematerial);

// scene plane
const scenePlaneGeometry = new THREE.PlaneGeometry(2, 2);
const scenePlaneMaterial = new THREE.MeshBasicMaterial({ color: "#000000" });
const scenePlane = new THREE.Mesh(scenePlaneGeometry, scenePlaneMaterial);
scenePlane.position.set(0,-5,0);
scenePlane.rotation.set(-Math.PI/2, 0,0);
scenePlane.scale.set(4,4);
scene.add(scenePlane);

// normal plane
scene.add(normalPlane);
// caustics plane
scene.add(causticPlane);
//depth plane 
scene.add(depthPlane);

// light
const spotLight = new THREE.SpotLight(0xffffff, 100); 
spotLight.position.set(0, 5, 0);
spotLight.penumbra = 0.5;
spotLight.decay = 2;
scene.add(spotLight);

const bounds = new THREE.Box3();

//animation loop
const tick = () => {
    // update controls for damping camera movement
    controls.update();
    normalPlane.visible = false;
    causticPlane.visible = false;
    scenePlane.visible = false;

    // render
    // update camera position with light
    normalCamera.position.copy(spotLight.position);
    normalCamera.lookAt(torusknot.position);

    // use normals for material
    // for (let i = 0; i < meshesToRender.length; i++) {
    for (const [name, mesh] of meshesToRender) {
        if (!mesh) {
            console.warn(`Missing mesh for ${name}`);
            continue;
        }
        mesh.material = normalMaterial;
        mesh.material.side = THREE.BackSide;
        
        if (name == "juice") {
            mesh.visible = gui_params.showJuice;
        }
        if (name == "torus") {
            mesh.visible = gui_params.showKnot;
        }
    }
    
    // change fbo
    renderer.setRenderTarget(normalRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();

    // render normals scene
    renderer.render(scene, normalCamera);
    normalPlane.visible = gui_params.showNormalPlane;
    causticPlane.visible = gui_params.showCausticPlane;
    depthPlane.visible = gui_params.showDepthPlane;
    
    // set back to original material
    for (const [name, mesh] of meshesToRender) {
        mesh.material = meshMaterials.get(name);
    }
    
    // rotate geometry
    torusknot.rotation.x += 0.005;
    torusknot.rotation.y += 0.01;

    // render receiver depth from light view
    for (const [name, mesh] of meshesToRender) {
        mesh.visible = false;
    }
    depthPlane.visible = false;
    scenePlane.visible = true;
    scenePlane.material = depthMaterial;

    renderer.setRenderTarget(depthRenderTarget);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear();
    renderer.render(scene, normalCamera);
    depthPlane.visible = gui_params.showDepthPlane;
    // restore
    for (const [name, mesh] of meshesToRender) { 
        mesh.visible = true;
        if (name == "juice") {
            mesh.visible = gui_params.showJuice;
        }
        if (name == "torus") {
            mesh.visible = gui_params.showKnot;
        }
    };

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

    scenePlane.visible = true;
    scenePlane.material = receiveCausticMaterial;


    renderer.setRenderTarget(null);
    // renderer.setClearColor(0x4287f5, 1);
    renderer.setClearColor(0x7ea1bf, 1);

    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();