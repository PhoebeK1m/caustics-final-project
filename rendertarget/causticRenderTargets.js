import * as THREE from 'three';
import { getReceiveCausticMaterial } from "../caustic/causticMaterials.js";

// create new render target for caustic map
export const causticRenderTarget = new THREE.WebGLRenderTarget(2048, 2048, {
    alpha: true,
    format: THREE.RGBAFormat
});
const causticPlaneMaterial = new THREE.MeshBasicMaterial({ 
    map: causticRenderTarget.texture 
});
// get material for caustics
const causticPlaneGeometry = new THREE.PlaneGeometry(2, 2);
export const causticPlane = new THREE.Mesh(causticPlaneGeometry, causticPlaneMaterial);
export const receiveCausticMaterial = getReceiveCausticMaterial();
causticPlane.position.set(-1.9, -0.3, -2);
causticPlane.scale.set(0.35, 0.35, 1.0);
causticPlane.renderOrder = 999;