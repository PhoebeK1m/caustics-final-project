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
const camera = new THREE.PerspectiveCamera(75, sizes.halfWidth / sizes.height, 0.1, 1000);
camera.position.z = 10; // set camera infront of object
scene.background = new THREE.Color(0x4287f5);

// set render window half of screen
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setScissorTest(true);
renderer.setScissor(0, 0, sizes.halfWidth, sizes.height);
renderer.setViewport(0, 0, sizes.halfWidth, sizes.height);

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

// sphere
const spheregeometry = new THREE.SphereGeometry(1, 32, 32);
const spherematerial = new THREE.MeshStandardMaterial({
    color: 0xa6baf5,
    transparent: true,
    opacity: 0.5
});
const sphere = new THREE.Mesh(spheregeometry, spherematerial);
scene.add(sphere);

// light
const spotLight = new THREE.SpotLight(0xffffff, 100); 
spotLight.position.set(5, 10, 5);
spotLight.angle = Math.PI / 6; 
spotLight.penumbra = 0.5;
spotLight.decay = 2;

scene.add(spotLight);

//animation loop
const tick = () => {
    // update controls for damping camera movement
    controls.update();

    // render
    renderer.render(scene, camera);

    // call tick again on the next frame
    window.requestAnimationFrame(tick);
};

tick();