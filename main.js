import * as THREE from 'three';
import GUI from 'lil-gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

import { getCausticMap, getCausticMaterial } from "./materials.js";
import { torusknot, torusmaterial, loadJuice, juicematerial } from "./objects.js";

// gui code and global parameters
const gui = new GUI();

let gui_params = {
	showNormalPlane: false,
    showCausticPlane: true,
    showJuice: false,
    showChromatic: true,
    intensity: 0.5,
    chromaticAberration: 0.2
};

gui.add(gui_params, 'showNormalPlane');
gui.add(gui_params, 'showCausticPlane');
gui.add(gui_params, 'showJuice');
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

// create hidden camera to render normals
const normalCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);

// create new render target (aka frame buffer object) for normals
const normalRenderTarget = new THREE.WebGLRenderTarget(2000, 2000, {
    type: THREE.HalfFloatType,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
});
// create material for rgb normal
const normalMaterial = new THREE.MeshNormalMaterial();

// create a plane to view normals
const normalPlaneGeometry = new THREE.PlaneGeometry(2, 2);
const normalPlaneMaterial = new THREE.MeshBasicMaterial({ 
    map: normalRenderTarget.texture 
});
const normalPlane = new THREE.Mesh(normalPlaneGeometry, normalPlaneMaterial);
normalPlane.position.set(0,-3,0);
normalPlane.rotation.set(-Math.PI/2, 0,0);
normalPlane.scale.set(2,2);
scene.add(normalPlane);

// create new render target for caustic map
const causticRenderTarget = new THREE.WebGLRenderTarget(2000, 2000, {
    alpha: true,
    format: THREE.RGBAFormat
});
// get material for caustics
const causticMap = getCausticMap();
const causticMaterial = getCausticMaterial();
const causticQuad = new FullScreenQuad();

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
const loaded = await loadJuice(juicematerial);
console.log(loaded);
const {juice, juicemesh} = loaded;
scene.add(juice);
meshesToRender.set("juice", juicemesh);
meshMaterials.set("juice", juicematerial);

// caustics plane
const causticPlaneGeometry = new THREE.PlaneGeometry(2, 2);
const causticPlane = new THREE.Mesh(causticPlaneGeometry, causticMaterial);
causticPlane.position.set(0,-2,0);
causticPlane.rotation.set(-Math.PI/2, 0,0);
scene.add(causticPlane);

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

    // find caustic center
    const lightDir = spotLight.position.clone().normalize();
    const targetObject = torusknot;
    const { center, radius } = computeCausticsBounds(targetObject, lightDir);
    
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
        // meshesToRender.get("juice").visible = gui_params.showJuice;
        if (name == "juice") {
            mesh.visible = gui_params.showJuice;
        }
    }
    
    // change fbo
    renderer.setRenderTarget(normalRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    // render normals scene
    renderer.render(scene, normalCamera);
    normalPlane.visible = gui_params.showNormalPlane;
    causticPlane.visible =gui_params.showCausticPlane;
    
    // set back to original material
    for (const [name, mesh] of meshesToRender) {
        mesh.material = meshMaterials.get(name);
    }
    // film here
    torusknot.rotation.x += 0.005;
    torusknot.rotation.y += 0.01;

    // render caustics
    causticQuad.material = causticMap;
    causticQuad.material.uniforms.uTexture.value = normalRenderTarget.texture;
    causticQuad.material.uniforms.uLight.value = spotLight.position;
    causticQuad.material.uniforms.uIntensity.value = gui_params.intensity;

    // put fbo onto plane
    renderer.setRenderTarget(causticRenderTarget);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    // by using the quads (actually 2 triangles) to find caustics (using area)
    causticQuad.render(renderer);

    const scaleCorrection = 1.35;
    causticPlane.position.set(
        center.x,
        -4,
        center.z
    );
    causticPlane.scale.setScalar(radius * scaleCorrection);
    causticPlane.material.uniforms.uTexture.value = causticRenderTarget.texture;
    causticPlane.material.uniforms.uAberration.value = gui_params.chromaticAberration;
    causticPlane.material.uniforms.uChromatic.value = gui_params.showChromatic;

    renderer.setRenderTarget(null);
    // renderer.setClearColor(0x4287f5, 1);
    renderer.setClearColor(0x7ea1bf, 1);

    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();

// project of caustic to ground will get rid of with raymarching
function computeCausticsBounds(object, lightDir) {
    bounds.setFromObject(object, true);

    const corners = [
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.min.x, bounds.max.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.min.y, bounds.max.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.min.z),
        new THREE.Vector3(bounds.max.x, bounds.max.y, bounds.max.z),
    ];

    const projected = corners.map((v) => {
        const t = (Math.abs(lightDir.y) < 0.0001) ? 0 : -v.y / lightDir.y;
        return new THREE.Vector3(
        v.x + lightDir.x * t,
        v.y + lightDir.y * t,
        v.z + lightDir.z * t
        );
    });

    const center = projected
        .reduce((a, b) => a.add(b), new THREE.Vector3())
        .divideScalar(projected.length);

    const radius = projected.reduce((max, p) => {
        const dx = p.x - center.x;
        const dz = p.z - center.z;
        return Math.max(max, Math.sqrt(dx * dx + dz * dz));
    }, 0);

    return { center, radius };
}