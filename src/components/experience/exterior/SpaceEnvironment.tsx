"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** A small local reflection probe for readable metal without a network HDRI. */
export function SpaceEnvironment({ eclipseActive = false, reducedMotion = false }: { eclipseActive?: boolean; reducedMotion?: boolean }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useFrame(() => {
    scene.environmentIntensity = THREE.MathUtils.lerp(
      scene.environmentIntensity,
      eclipseActive ? 0.025 : 0.17,
      reducedMotion ? 1 : 0.045,
    );
  });

  useEffect(() => {
    const previous = scene.environment;
    const previousIntensity = scene.environmentIntensity;
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.035);
    scene.environment = target.texture;
    scene.environmentIntensity = 0.17;
    return () => {
      scene.environment = previous;
      scene.environmentIntensity = previousIntensity;
      room.dispose();
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}
