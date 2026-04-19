import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

import { getCausticMap, getCausticMaterial } from "./materials.js";

let showNormalPlane = false;
let showCausticPlane = true;
let showJuice = false;
let showChromatic = true;
let intensity = 0.5;
let chromaticAberration = 0.2;
const meshesToRender = [];
const meshMaterials = [];

// set up webgl/three scene
const canvas = document.querySelector('canvas.webgl');
const scene = new THREE.Scene();
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    halfWidth: window.innerWidth / 2
};
const camera = new THREE.PerspectiveCamera(65, sizes.halfWidth / sizes.height, 0.1, 1000);
camera.position.z = 10; // set camera infront of object
// scene.background = new THREE.Color(0x4287f5);

// set render window half of screen
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setScissorTest(true);
renderer.setScissor(0, 0, sizes.halfWidth, sizes.height);
renderer.setViewport(0, 0, sizes.halfWidth, sizes.height);

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

// // pickle
const loader = new GLTFLoader();
// let pickle;
// loader.load(
//     './models/pickle.glb',
//     (gltf) => {
//         pickle = gltf.scene;
//         scene.add(pickle);        
//         pickle.scale.set(1, 1, 1);
//     },
//     (progress) => {
//         console.log('progress:', (progress.loaded / progress.total * 100) + '%');
//     },
//     (error) => {
//         console.error('an error occured while loading model:', error);
//     }
// );

// juice
let juice;
const juicematerial = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.5,
    color: "#ffffff",
});

loader.load(
    './models/juice1.glb',
    (gltf) => {
        juice = gltf.scene;

        juice.traverse((node) => {
            if (node.isMesh) {
                node.geometry.computeVertexNormals();
                node.material = juicematerial;
                meshesToRender.push(node);
                meshMaterials.push(juicematerial);
            }
        });
        scene.add(juice);        
        juice.scale.set(1, 1, 1);
    },
    (progress) => {
        console.log('progress:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('an error occured while loading model:', error);
    }
);

// knot
const geometry = new THREE.TorusKnotGeometry(200, 40, 600, 16);
const material = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.5,
    color: "#ffffff",
});
const torusknot = new THREE.Mesh(geometry, material);
torusknot.scale.setScalar(0.005);
scene.add(torusknot);
meshesToRender.push(torusknot);
meshMaterials.push(material);

// caustics plane
const causticPlaneGeometry = new THREE.PlaneGeometry(2, 2);
const causticPlane = new THREE.Mesh(causticPlaneGeometry, causticMaterial);
causticPlane.position.set(0,-3,0);
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
    for (let i = 0; i < meshesToRender.length; i++) {
        meshesToRender[i].material = normalMaterial;
        meshesToRender[i].material.side = THREE.BackSide;
        if (i > 0) {
            meshesToRender[i].visible = showJuice;
        }
    }
    
    // change fbo
    renderer.setRenderTarget(normalRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    // render normals scene
    renderer.render(scene, normalCamera);
    normalPlane.visible = showNormalPlane;
    causticPlane.visible = showCausticPlane;
    
    // set back to original material
    for (let i = 0; i < meshesToRender.length; i++) {
        meshesToRender[i].material = meshMaterials[i];
    }
    // film here
    torusknot.rotation.x += 0.005;
    torusknot.rotation.y += 0.01;

    // render caustics
    causticQuad.material = causticMap;
    causticQuad.material.uniforms.uTexture.value = normalRenderTarget.texture;
    causticQuad.material.uniforms.uLight.value = spotLight.position;
    causticQuad.material.uniforms.uIntensity.value = intensity;

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
    causticPlane.material.uniforms.uAberration.value = chromaticAberration;
    causticPlane.material.uniforms.uChromatic.value = showChromatic;

    renderer.setRenderTarget(null);
    renderer.setClearColor(0x4287f5, 1);

    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'n') {
        showNormalPlane = !showNormalPlane;
        showCausticPlane = !showCausticPlane;
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'j') {
        showJuice = !showJuice;
    }
});

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c') {
        showChromatic = !showChromatic;
    }
});

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