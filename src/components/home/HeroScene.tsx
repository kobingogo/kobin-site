"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraTimeline } from "@/components/three/CameraTimeline";
import { LightRig } from "@/components/three/LightRig";
import {
  HERO_ANCHORS,
  HERO_KEYS,
  HERO_TIMELINE_CONFIG,
} from "@/lib/hero-timeline";

type HeroSceneProps = {
  /** 0–1 scroll progress; drives ambient object motion (camera is owned by CameraTimeline). */
  scrollProgress: number;
  /** Shared DoF autofocus target, written by CameraTimeline each frame. */
  focusRef: MutableRefObject<THREE.Vector3>;
};

/**
 * Dark-tech procedural hero: geo rings + low-poly core + sparse particles.
 * Lighting via shared LightRig(tech); camera via shared CameraTimeline
 * (dwell-parked stations anchored to the content sections).
 * W2 replaces HERO_KEYS with the home-world.glb CameraAction track.
 */
export function HeroScene({ scrollProgress, focusRef }: HeroSceneProps) {
  const core = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 360;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.4 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollProgress;

    if (core.current) {
      core.current.rotation.y = t * 0.1 + p * 0.65;
      core.current.rotation.x = Math.sin(t * 0.18) * 0.06 + p * 0.18;
    }
    if (rings.current) {
      rings.current.rotation.z = t * 0.08;
      rings.current.rotation.y = -t * 0.05 + p * 0.4;
    }
    if (particles.current) {
      particles.current.rotation.y = t * 0.03;
    }
  });

  return (
    <>
      {/* Opaque bg: EffectComposer on alpha canvases has black-artifact pitfalls; page bg is the same #020617 */}
      <color attach="background" args={["#020617"]} />
      <LightRig preset="tech" />

      <group ref={core}>
        <mesh>
          <icosahedronGeometry args={[1.02, 1]} />
          <meshStandardMaterial
            color="#22d3ee"
            wireframe
            transparent
            opacity={0.42}
            emissive="#0e7490"
            emissiveIntensity={0.28}
          />
        </mesh>
        <mesh scale={0.68}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#7c6aaf"
            flatShading
            metalness={0.55}
            roughness={0.32}
            emissive="#312e81"
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>

      <group ref={rings}>
        <mesh rotation={[Math.PI / 2.4, 0.2, 0]}>
          <torusGeometry args={[1.75, 0.012, 8, 96]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} />
        </mesh>
        <mesh rotation={[Math.PI / 3.1, -0.35, 0.4]}>
          <torusGeometry args={[2.15, 0.008, 8, 96]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.18} />
        </mesh>
        <mesh rotation={[1.1, 0.5, -0.2]} position={[0, -0.15, 0]}>
          <torusGeometry args={[2.55, 0.006, 6, 72]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.12} />
        </mesh>
      </group>

      {/* Restrained floor grid — dark tech, low contrast */}
      <gridHelper args={[10, 20, "#0e7490", "#0f172a"]} position={[0, -1.35, 0]} />

      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.028}
          color="#67e8f9"
          sizeAttenuation
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </points>

      <CameraTimeline
        keys={HERO_KEYS}
        anchors={[...HERO_ANCHORS]}
        focusRef={focusRef}
        {...HERO_TIMELINE_CONFIG}
      />
    </>
  );
}
