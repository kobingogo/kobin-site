"use client";

import { useGLTF } from "@react-three/drei";
import { getAsset } from "@/lib/three/assets";

/**
 * Load a GLB registered in the asset registry by id.
 * Throws on unknown ids — registry membership is the license/budget gate.
 */
export function useGlbScene(id: string) {
  const entry = getAsset(id);
  if (!entry) {
    throw new Error(`[three/assets] unknown asset id: ${id}`);
  }
  const gltf = useGLTF(entry.url);
  return { gltf, entry };
}

export function preloadGlb(id: string) {
  const entry = getAsset(id);
  if (entry) useGLTF.preload(entry.url);
}
