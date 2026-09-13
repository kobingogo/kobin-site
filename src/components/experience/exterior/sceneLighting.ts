import * as THREE from "three";

// One astronomical direction drives every lit layer in the exterior scene.
// Keeping this relationship shared is more important than any individual light.
export const SUN_DIRECTION = new THREE.Vector3(0.18, 0.87, -0.45).normalize();
export const SUN_LIGHT_POSITION = SUN_DIRECTION.clone().multiplyScalar(18);
