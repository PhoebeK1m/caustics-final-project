import * as THREE from 'three';

export const depthRenderTarget = new THREE.WebGLRenderTarget(2000, 2000, {
    type: THREE.HalfFloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
});

export const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
});

// create a plane to view normals
const depthPlaneGeometry = new THREE.PlaneGeometry(2, 2);
const depthPlaneMaterial = new THREE.MeshBasicMaterial({ 
    map: depthRenderTarget.texture 
});
export const depthPlane = new THREE.Mesh(depthPlaneGeometry, depthPlaneMaterial);
depthPlane.position.set(-1.9, 0.82, -2);
depthPlane.scale.set(0.35, 0.35, 1.0);
depthPlane.renderOrder = 999;