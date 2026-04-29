import * as THREE from 'three';

// create hidden camera to render normals
export const normalCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);

// create new render target (aka frame buffer object) for normals
export const normalRenderTarget = new THREE.WebGLRenderTarget(2000, 2000, {
    type: THREE.HalfFloatType,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
});
// create material for rgb normal
export const normalMaterial = new THREE.MeshNormalMaterial();

// create a plane to view normals
const normalPlaneGeometry = new THREE.PlaneGeometry(2, 2);
const normalPlaneMaterial = new THREE.MeshBasicMaterial({ 
    map: normalRenderTarget.texture 
});
export const normalPlane = new THREE.Mesh(normalPlaneGeometry, normalPlaneMaterial);
normalPlane.position.set(-1.9, -0.82, -2);
normalPlane.scale.set(0.35, 0.35, 1.0);
normalPlane.renderOrder = 999;