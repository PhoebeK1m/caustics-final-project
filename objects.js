import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

//pickle juice
export const juicematerial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#a9c22f"),
    roughness: 0.05,
    metalness: 0,
    transmission: 1.0,
    thickness: 1.0,
    ior: 1.33,
    transparent: true,
    opacity: 0.5,
    envMapIntensity: 1.5,
});

export async function loadJuice(material = juicematerial) {
    const gltf = await loader.loadAsync("./models/juice1.glb");

    const juice = gltf.scene;
    let juicemesh;

    juice.scale.set(1, 1, 1);

    juice.traverse((node) => {
        if (node.isMesh) {
        node.geometry.computeVertexNormals();
        node.material = material;
        juicemesh = node;
        }
    });

    return { juice, juicemesh };
}

// torus knot
const geometry = new THREE.TorusKnotGeometry(200, 40, 600, 16);

export const torusmaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#5b9cd9"),
    roughness: 0.05,
    metalness: 0,
    transmission: 1.0,
    thickness: 1.0,
    ior: 1.33,
    transparent: true,
    opacity: 0.29,
    envMapIntensity: 1.5,
});

export const torusknot = new THREE.Mesh(geometry, torusmaterial);
export const torusknot1 = new THREE.Mesh(geometry, torusmaterial);
torusknot.scale.setScalar(0.005);
torusknot1.scale.setScalar(0.005);

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