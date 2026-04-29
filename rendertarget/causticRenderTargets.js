import * as THREE from 'three';
import { getCausticMap, getCausticMaterial, getReceiveCausticMaterial } from "../caustic/causticMaterials.js";
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// create new render target for caustic map
export const causticRenderTarget = new THREE.WebGLRenderTarget(2048, 2048, {
    alpha: true,
    format: THREE.RGBAFormat
});

// get material for caustics
export const causticMap = getCausticMap();
export const causticQuad = new FullScreenQuad();

export const causticMaterial = getCausticMaterial();
const causticPlaneGeometry = new THREE.PlaneGeometry(2, 2);
export const causticPlane = new THREE.Mesh(causticPlaneGeometry, causticMaterial);
export const receiveCausticMaterial = getReceiveCausticMaterial();
causticPlane.position.set(-1.9, 0, -2);
causticPlane.scale.set(0.35, 0.35, 1.0);
causticPlane.renderOrder = 999;