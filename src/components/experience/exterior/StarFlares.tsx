"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function makeFlareTexture(size = 128) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = ((x + 0.5) / size) * 2 - 1;
      const py = ((y + 0.5) / size) * 2 - 1;
      const distance = Math.hypot(px, py);
      const core = Math.exp(-distance * distance * 180);
      const horizontal = Math.exp(-Math.abs(py) * 72) * Math.exp(-Math.abs(px) * 4.2);
      const vertical = Math.exp(-Math.abs(px) * 72) * Math.exp(-Math.abs(py) * 4.2);
      const diagonalA = Math.exp(-Math.abs(px - py) * 95) * Math.exp(-distance * 7.5);
      const diagonalB = Math.exp(-Math.abs(px + py) * 95) * Math.exp(-distance * 7.5);
      const alpha = THREE.MathUtils.clamp(
        core + horizontal * 0.34 + vertical * 0.34 + (diagonalA + diagonalB) * 0.08,
        0,
        1,
      );
      const offset = (y * size + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(alpha * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const FLARES = [
  { position: [-7.8, 4.8, -28] as [number, number, number], scale: 1.04, color: "#c9e9ff" },
  { position: [-3.1, 2.65, -34] as [number, number, number], scale: 0.46, color: "#ffe1bd" },
  { position: [0.15, 5.2, -31] as [number, number, number], scale: 0.66, color: "#d9edff" },
  { position: [4.65, 3.9, -30] as [number, number, number], scale: 0.52, color: "#ffe3bd" },
  { position: [7.3, -0.1, -36] as [number, number, number], scale: 0.38, color: "#bddfff" },
] as const;

export function StarFlares({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const texture = useMemo(() => makeFlareTexture(), []);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.015) * 0.003;
  });

  return (
    <group ref={group}>
      {FLARES.map((flare, index) => (
        <sprite key={index} position={flare.position} scale={[flare.scale, flare.scale, 1]}>
          <spriteMaterial
            map={texture}
            color={flare.color}
            transparent
            opacity={index === 0 ? 0.94 : 0.74}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
