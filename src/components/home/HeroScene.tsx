"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type HeroSceneProps = {
  /** 0–1 scroll progress; drives camera scrub stand-in for future CameraAction GLB bake */
  scrollProgress: number;
};

/**
 * Lightweight particle + low-poly hero.
 * No heavy GLB. Bloom/DOF / real character are out of scope.
 *
 * FUTURE BAKE PLUG-IN:
 * When sen-style baked CameraAction GLB is ready, replace the camera scrub
 * in `useFrame` below with the baked camera track (and optionally swap this
 * scene for the authored hero). Keep `scrollProgress` as the scrub driver.
 */
export function HeroScene({ scrollProgress }: HeroSceneProps) {
  const group = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 480;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + Math.random() * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.6;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.rotation.y = t * 0.12 + scrollProgress * 0.8;
      group.current.rotation.x = Math.sin(t * 0.2) * 0.08 + scrollProgress * 0.25;
    }
    if (particles.current) {
      particles.current.rotation.y = t * 0.04;
    }

    // Camera scrub stand-in — plug baked CameraAction GLB here later
    const cam = state.camera;
    const targetZ = 5.2 - scrollProgress * 2.4;
    const targetY = 0.4 + scrollProgress * 1.1;
    cam.position.z = THREE.MathUtils.damp(cam.position.z, targetZ, 4, delta);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, targetY, 4, delta);
    cam.lookAt(0, scrollProgress * 0.3, 0);
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial
          color="#22d3ee"
          wireframe
          transparent
          opacity={0.55}
          emissive="#0891b2"
          emissiveIntensity={0.35}
        />
      </mesh>
      <mesh scale={0.72}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#a78bfa"
          flatShading
          metalness={0.4}
          roughness={0.35}
        />
      </mesh>
      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#67e8f9"
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 2]} intensity={1.1} color="#e0f2fe" />
      <pointLight position={[-3, -2, -2]} intensity={0.6} color="#c084fc" />
    </group>
  );
}
