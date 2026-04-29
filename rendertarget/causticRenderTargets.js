import * as THREE from 'three';
import { getCausticMap, getCausticMaterial, getReceiveCausticMaterial } from "../materials.js";
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// create new render target for caustic map
export const causticRenderTarget = new THREE.WebGLRenderTarget(2000, 2000, {
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