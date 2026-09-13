"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SceneView } from "./types";

const VIEW_PHASE: Record<SceneView, number> = {
  home: 0,
  about: 0.58,
  works: 1.28,
  contact: 2.08,
};

function OrbitNode({ radius, phase, color }: { radius: number; phase: number; color: string }) {
  const node = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!node.current) return;
    const angle = phase + clock.elapsedTime * 0.055;
    node.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  });
  return (
    <group ref={node}>
      <mesh>
        <sphereGeometry args={[0.035, 10, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <pointLight color={color} intensity={0.34} distance={1.2} decay={2} />
    </group>
  );
}

export function OrbitalTelemetry({
  view,
  mobile = false,
  reduced = false,
  reducedMotion = false,
  activationKey = 0,
}: {
  view: SceneView;
  mobile?: boolean;
  reduced?: boolean;
  reducedMotion?: boolean;
  activationKey?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const primary = useRef<THREE.MeshBasicMaterial>(null);
  const secondary = useRef<THREE.MeshBasicMaterial>(null);
  const pulse = useRef<THREE.Mesh>(null);
  const pulseMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const transitionStarted = useRef(0);
  const baseScale = mobile ? 0.58 : 1;
  const center = useMemo<[number, number, number]>(() => mobile ? [0.62, 1.08, -1.45] : [2.65, -0.52, -2.15], [mobile]);

  useEffect(() => {
    transitionStarted.current = performance.now() / 1000;
  }, [activationKey, view]);

  useFrame(({ clock }, delta) => {
    if (!group.current || !primary.current || !secondary.current) return;
    const active = view !== "home";
    const reveal = reducedMotion ? 1 : THREE.MathUtils.smoothstep(clock.elapsedTime, 1.15, 3.6);
    group.current.scale.setScalar(baseScale * (0.93 + reveal * 0.07));
    group.current.rotation.z += reducedMotion ? 0 : delta * 0.006;
    primary.current.opacity = THREE.MathUtils.lerp(primary.current.opacity, active ? reveal * 0.2 : 0, 0.08);
    secondary.current.opacity = THREE.MathUtils.lerp(secondary.current.opacity, active ? reveal * 0.055 : 0, 0.08);
    group.current.visible = active || primary.current.opacity > 0.005;

    if (pulse.current && pulseMaterial.current) {
      const age = performance.now() / 1000 - transitionStarted.current;
      const progress = THREE.MathUtils.clamp(age / 1.1, 0, 1);
      pulse.current.scale.setScalar(0.55 + progress * 1.25);
      pulseMaterial.current.opacity = Math.sin(progress * Math.PI) * 0.36;
    }
  });

  return (
    <group ref={group} position={center} rotation={[1.08, 0.28, -0.48]}>
      <mesh renderOrder={2}>
        <torusGeometry args={[3.82, reduced ? 0.007 : 0.009, 5, reduced ? 112 : 220, Math.PI * 1.72]} />
        <meshBasicMaterial
          ref={primary}
          color="#65d8ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {!reduced ? (
        <mesh rotation={[0, 0, 1.24]} renderOrder={1}>
          <torusGeometry args={[3.18, 0.004, 4, 180, Math.PI * 1.24]} />
          <meshBasicMaterial
            ref={secondary}
            color="#f5a650"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <OrbitNode radius={3.82} phase={VIEW_PHASE[view]} color="#b7efff" />
      {!reduced ? <OrbitNode radius={3.18} phase={VIEW_PHASE[view] + 2.2} color="#ffb760" /> : null}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <mesh ref={pulse} renderOrder={4}>
          <ringGeometry args={[1.08, 1.1, 96]} />
          <meshBasicMaterial
            ref={pulseMaterial}
            color="#8ce8ff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
