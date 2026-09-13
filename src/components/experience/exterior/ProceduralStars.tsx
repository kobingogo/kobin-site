"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type StarLayerProps = {
  count: number;
  radius: number;
  size: number;
  opacity: number;
  seed: number;
  speed: number;
};

function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function StarLayer({ count, radius, size, opacity, seed, speed }: StarLayerProps) {
  const points = useRef<THREE.Points>(null);
  const { positions, colors } = useMemo(() => {
    const rand = random(seed);
    const starPositions = new Float32Array(count * 3);
    const starColors = new Float32Array(count * 3);
    const cool = new THREE.Color("#b8d8ff");
    const warm = new THREE.Color("#ffe7c2");
    const white = new THREE.Color("#ffffff");
    const mixed = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      // Keep every star beyond Earth's farthest surface (~73 world units).
      const distance = radius * (0.96 + rand() * 0.04);
      const offset = index * 3;
      starPositions[offset] = distance * Math.sin(phi) * Math.cos(theta);
      starPositions[offset + 1] = distance * Math.cos(phi);
      starPositions[offset + 2] = distance * Math.sin(phi) * Math.sin(theta);

      const tint = rand();
      mixed.copy(tint < 0.18 ? warm : tint > 0.78 ? cool : white);
      mixed.multiplyScalar(0.58 + rand() * 0.42);
      starColors[offset] = mixed.r;
      starColors[offset + 1] = mixed.g;
      starColors[offset + 2] = mixed.b;
    }

    return { positions: starPositions, colors: starColors };
  }, [count, radius, seed]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    points.current.rotation.y = clock.elapsedTime * speed;
    points.current.rotation.x = Math.sin(clock.elapsedTime * speed * 0.45) * 0.015;
  });

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        sizeAttenuation
        vertexColors
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}

export function ProceduralStars({ reduced = false, reducedMotion = false }: { reduced?: boolean; reducedMotion?: boolean }) {
  return (
    <group rotation={[0.05, 0, -0.08]}>
      <StarLayer count={reduced ? 2100 : 6800} radius={130} size={0.22} opacity={0.58} seed={1127} speed={reducedMotion ? 0 : 0.00006} />
      <StarLayer count={reduced ? 480 : 1580} radius={120} size={0.31} opacity={0.78} seed={9419} speed={reducedMotion ? 0 : 0.00005} />
      <StarLayer count={reduced ? 64 : 190} radius={110} size={0.46} opacity={0.9} seed={3109} speed={reducedMotion ? 0 : 0.00004} />
    </group>
  );
}
