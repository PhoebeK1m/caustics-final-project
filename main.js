import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
const normalCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);

// create new render target (aka frame buffer object)
const normalRenderTarget = new THREE.WebGLRenderTarget(2000, 2000);

// create material for rgb normal
const normalMaterial = new THREE.MeshNormalMaterial();

// create a plane to view normals
const normalPlaneGeometry = new THREE.PlaneGeometry(2, 2);
const normalPlaneMaterial = new THREE.MeshBasicMaterial({ map: normalRenderTarget.texture });
const normalPlane = new THREE.Mesh(normalPlaneGeometry, normalPlaneMaterial);
normalPlane.position.set(0,-3,0);
normalPlane.rotation.set(-Math.PI/2, 0,0);
scene.add(normalPlane);

// camera movement
const controls = new OrbitControls(camera, canvas);
const fixedRadius = 5;
controls.minDistance = fixedRadius; // drag rotates and translate camera around target
controls.maxDistance = fixedRadius;
controls.enableZoom = false; 
controls.enableDamping = true;

// geometry

// // pickle
// const loader = new GLTFLoader();
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

// knot
const geometry = new THREE.TorusKnotGeometry(200, 40, 600, 16);
const material = new THREE.MeshStandardMaterial({
    color: 0xa6baf5,
    transparent: true,
    opacity: 0.5
});
const torusknot = new THREE.Mesh(geometry, material);
torusknot.scale.setScalar(0.005);
scene.add(torusknot);

// light
const spotLight = new THREE.SpotLight(0xffffff, 100); 
spotLight.position.set(0, 5, 0);
spotLight.penumbra = 0.5;
spotLight.decay = 2;

scene.add(spotLight);

//animation loop
const tick = () => {
    // update controls for damping camera movement
    controls.update();
    normalPlane.visible = false;
    // render
    // update camera position with light
    normalCamera.position.copy(spotLight.position);
    normalCamera.lookAt(torusknot.position);

    // use normals for material
    const originalMaterial = torusknot.material;
    torusknot.material = normalMaterial;
    torusknot.material.side = THREE.BackSide;
    
    // change fbo
    renderer.setRenderTarget(normalRenderTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    // render normals scene
    renderer.render(scene, normalCamera);
    normalPlane.visible = true;
    
    // set back to original material
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x4287f5, 1);
    torusknot.material = originalMaterial;
    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();