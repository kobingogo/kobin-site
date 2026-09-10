"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type HeroSceneProps = {
  /** 0–1 scroll progress; drives sen-style camera scrub (procedural stand-in for baked CameraAction GLB) */
  scrollProgress: number;
};

/** Keyframed camera path — scroll scrub replaces future CameraAction GLB bake */
const CAM_KEYS = [
  { p: 0, pos: new THREE.Vector3(0.15, 0.55, 5.4), look: new THREE.Vector3(0, 0.05, 0) },
  { p: 0.28, pos: new THREE.Vector3(1.35, 0.95, 3.9), look: new THREE.Vector3(0.1, 0.15, 0) },
  { p: 0.55, pos: new THREE.Vector3(-0.85, 1.45, 2.85), look: new THREE.Vector3(0, 0.25, -0.1) },
  { p: 0.82, pos: new THREE.Vector3(0.55, 2.05, 2.15), look: new THREE.Vector3(0, 0.35, 0) },
  { p: 1, pos: new THREE.Vector3(0.05, 2.55, 1.55), look: new THREE.Vector3(0, 0.45, 0.05) },
] as const;

function scrubCamera(progress: number, outPos: THREE.Vector3, outLook: THREE.Vector3) {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  let i = 0;
  while (i < CAM_KEYS.length - 2 && CAM_KEYS[i + 1].p < t) i += 1;
  const a = CAM_KEYS[i];
  const b = CAM_KEYS[i + 1];
  const u = (t - a.p) / Math.max(1e-6, b.p - a.p);
  const s = u * u * (3 - 2 * u); // smoothstep
  outPos.lerpVectors(a.pos, b.pos, s);
  outLook.lerpVectors(a.look, b.look, s);
}

/**
 * Dark-tech procedural hero: geo rings + low-poly core + sparse particles.
 * Bloom/DOF / real character / heavy GLB are out of scope.
 *
 * FUTURE BAKE: replace scrubCamera path with sen-style CameraAction GLB;
 * keep scrollProgress as the scrub driver.
 */
export function HeroScene({ scrollProgress }: HeroSceneProps) {
  const core = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  const lookCurrent = useMemo(() => new THREE.Vector3(0, 0.05, 0), []);

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

  useFrame((state, delta) => {
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

    scrubCamera(p, targetPos, targetLook);
    const cam = state.camera;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, targetPos.x, 5, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, targetPos.y, 5, delta);
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetPos.z, 5, delta);
    lookCurrent.x = THREE.MathUtils.damp(lookCurrent.x, targetLook.x, 5, delta);
    lookCurrent.y = THREE.MathUtils.damp(lookCurrent.y, targetLook.y, 5, delta);
    lookCurrent.z = THREE.MathUtils.damp(lookCurrent.z, targetLook.z, 5, delta);
    cam.lookAt(lookCurrent);
  });

  return (
    <>
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
      <gridHelper
        args={[10, 20, "#0e7490", "#0f172a"]}
        position={[0, -1.35, 0]}
      />

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

      <ambientLight intensity={0.28} />
      <directionalLight position={[4, 6, 2]} intensity={0.95} color="#e0f2fe" />
      <pointLight position={[-3.2, -1.5, -2]} intensity={0.45} color="#818cf8" />
      <pointLight position={[2.5, 2.2, 1.5]} intensity={0.25} color="#22d3ee" />
    </>
  );
}
