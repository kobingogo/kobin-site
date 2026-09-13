"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { DEMOS } from "@/lib/demos";
import type { SceneView } from "./types";

const DESKTOP_NODES: [number, number, number][] = [
  [4.25, 1.25, -0.65],
  [5.0, -0.15, -0.9],
  [4.0, -1.75, -0.65],
  [2.15, -1.5, -0.85],
];

const MOBILE_NODES: [number, number, number][] = [
  [-0.15, 2.2, -0.8],
  [1.55, 2.35, -1.1],
  [1.85, 0.85, -0.8],
  [-0.3, 0.72, -1.1],
];

function SatelliteNode({
  index,
  position,
  active,
  reducedMotion,
  size,
  selected,
  onHover,
  onSelect,
}: {
  index: number;
  position: [number, number, number];
  active: boolean;
  reducedMotion: boolean;
  size: number;
  selected: boolean;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const hovered = useRef(false);
  const canvas = useThree((state) => state.gl.domElement);

  useFrame(({ clock }) => {
    if (!group.current || !halo.current) return;
    const targetScale = active ? size * (selected ? 1.16 : 1) : 0.001;
    const current = group.current.scale.x;
    const next = THREE.MathUtils.lerp(current, targetScale, reducedMotion ? 1 : 0.075);
    group.current.scale.setScalar(next);
    group.current.visible = active || next > 0.01;
    if (!reducedMotion) {
      group.current.rotation.y = clock.elapsedTime * (0.12 + index * 0.015) + index;
      group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.55 + index * 1.7) * 0.06;
    }
    halo.current.opacity = active ? (hovered.current || selected ? 0.72 : 0.18) : 0;
  });

  return (
    <group
      ref={group}
      position={position}
      scale={0.001}
      onPointerEnter={(event) => {
        if (!active) return;
        event.stopPropagation();
        hovered.current = true;
        canvas.style.cursor = "pointer";
        canvas.dataset.cursorLabel = "OPEN";
        onHover(true);
      }}
      onPointerLeave={() => {
        hovered.current = false;
        canvas.style.cursor = "grab";
        delete canvas.dataset.cursorLabel;
        onHover(false);
      }}
      onClick={(event) => {
        if (!active) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      <mesh rotation={[0.35, 0, Math.PI / 4]}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#c5c9c8" emissive="#6d451e" emissiveIntensity={0.5} metalness={0.78} roughness={0.3} />
      </mesh>
      <mesh position={[-0.31, 0, 0]}>
        <boxGeometry args={[0.34, 0.018, 0.18]} />
        <meshStandardMaterial color="#111820" emissive="#3f2a16" emissiveIntensity={0.24} metalness={0.68} roughness={0.38} />
      </mesh>
      <mesh position={[0.31, 0, 0]}>
        <boxGeometry args={[0.34, 0.018, 0.18]} />
        <meshStandardMaterial color="#111820" emissive="#3f2a16" emissiveIntensity={0.24} metalness={0.68} roughness={0.38} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.008, 4, 48]} />
        <meshBasicMaterial ref={halo} color="#e7b36a" transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#ffb45c" intensity={0.25} distance={1.2} decay={2} />
    </group>
  );
}

function ProjectSatellites({
  view,
  mobile,
  reducedMotion,
  hoveredProject,
  onProjectHover,
}: {
  view: SceneView;
  mobile: boolean;
  reducedMotion: boolean;
  hoveredProject: number | null;
  onProjectHover?: (index: number | null) => void;
}) {
  const router = useRouter();
  const positions = mobile ? MOBILE_NODES : DESKTOP_NODES;
  return (
    <group>
      {DEMOS.map((demo, index) => (
        <SatelliteNode
          key={demo.slug}
          index={index}
          position={positions[index]}
          active={view === "works"}
          reducedMotion={reducedMotion}
          size={mobile ? 0.48 : 0.62}
          selected={hoveredProject === index}
          onHover={(hovered) => onProjectHover?.(hovered ? index : null)}
          onSelect={() => router.push(demo.href)}
        />
      ))}
    </group>
  );
}

function CommunicationBeam({ active, reduced, reducedMotion }: { active: boolean; reduced: boolean; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.MeshBasicMaterial>(null);
  const echo = useRef<THREE.MeshBasicMaterial>(null);
  const pulseGroup = useRef<THREE.Group>(null);
  const dish = useRef<THREE.Group>(null);
  const response = useRef<THREE.Mesh>(null);
  const responseMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const started = useRef(-10);
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(2.7, -0.25, -0.25),
    new THREE.Vector3(-0.4, -0.1, -3.8),
    new THREE.Vector3(-5.1, -4.75, -8.4),
  ), []);
  const pulsePoints = useMemo(() => [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], []);

  useEffect(() => {
    if (active) started.current = performance.now() / 1000;
  }, [active]);

  useFrame(({ clock }) => {
    if (!beam.current || !echo.current) return;
    const age = performance.now() / 1000 - started.current;
    const linkReady = active && (reducedMotion || age > 0.58);
    beam.current.opacity = THREE.MathUtils.lerp(beam.current.opacity, linkReady ? 0.62 : 0, 0.08);
    echo.current.opacity = THREE.MathUtils.lerp(echo.current.opacity, linkReady ? 0.12 : 0, 0.06);
    if (group.current) group.current.visible = active || beam.current.opacity > 0.01;
    if (dish.current) {
      const target = active ? -0.72 : 0.15;
      dish.current.rotation.z = THREE.MathUtils.lerp(dish.current.rotation.z, target, reducedMotion ? 1 : 0.055);
    }
    if (response.current && responseMaterial.current) {
      const responseAge = Math.max(0, age - 1.05);
      const responsePulse = active ? (responseAge % 1.25) / 1.25 : 0;
      response.current.scale.setScalar(0.55 + responsePulse * 1.6);
      responseMaterial.current.opacity = active && responseAge > 0
        ? Math.sin(responsePulse * Math.PI) * 0.52
        : 0;
    }
    if (!pulseGroup.current) return;
    pulseGroup.current.visible = linkReady;
    pulseGroup.current.children.forEach((child, index) => {
      const travel = reducedMotion ? index / 3 : (clock.elapsedTime * 0.22 + index / 3) % 1;
      curve.getPoint(travel, pulsePoints[index]);
      child.position.copy(pulsePoints[index]);
    });
  });

  return (
    <group ref={group} visible={false}>
      <mesh>
        <tubeGeometry args={[curve, reduced ? 48 : 96, 0.012, 4, false]} />
        <meshBasicMaterial ref={beam} color="#8deaff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {!reduced ? (
        <mesh>
          <tubeGeometry args={[curve, 96, 0.038, 5, false]} />
          <meshBasicMaterial ref={echo} color="#1589bf" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      ) : null}
      <group ref={pulseGroup} visible={false}>
        {pulsePoints.map((_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.035, 8, 6]} />
            <meshBasicMaterial color={index === 1 ? "#ffd07a" : "#d8f8ff"} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <group ref={dish} position={[3.05, 1.68, 0.28]} rotation={[0.25, 0.1, 0.15]} scale={0.72}>
        <mesh rotation={[0, 0, -Math.PI / 2]}>
          <sphereGeometry args={[0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.46]} />
          <meshStandardMaterial color="#d0d3d2" metalness={0.82} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <cylinderGeometry args={[0.025, 0.045, 0.44, 8]} />
          <meshStandardMaterial color="#252a30" metalness={0.8} roughness={0.42} />
        </mesh>
        <pointLight color="#ffb35a" intensity={active ? 0.32 : 0} distance={1.4} decay={2} />
      </group>
      <Billboard position={[-5.1, -4.75, -8.4]}>
        <mesh ref={response} renderOrder={5}>
          <ringGeometry args={[0.15, 0.165, 64]} />
          <meshBasicMaterial ref={responseMaterial} color="#8feeff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

function DeepSpaceSignal({ unlocked, reducedMotion }: { unlocked: boolean; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!group.current || !ring.current) return;
    const target = unlocked ? 1 : 0.001;
    const scale = THREE.MathUtils.lerp(group.current.scale.x, target, reducedMotion ? 1 : 0.045);
    group.current.scale.setScalar(scale);
    group.current.visible = unlocked || scale > 0.01;
    group.current.rotation.z = reducedMotion ? 0 : clock.elapsedTime * -0.08;
    ring.current.opacity = unlocked ? 0.32 + Math.sin(clock.elapsedTime * 1.4) * 0.12 : 0;
  });
  return (
    <group ref={group} position={[-1.35, 3.35, -10]} scale={0.001}>
      <mesh>
        <torusKnotGeometry args={[0.42, 0.008, 96, 5, 2, 3]} />
        <meshBasicMaterial ref={ring} color="#bf77ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight color="#8d4cff" intensity={0.35} distance={2.5} decay={2} />
    </group>
  );
}

export function SceneEvents({
  view,
  activationCount,
  reduced,
  reducedMotion,
  hoveredProject,
  onProjectHover,
}: {
  view: SceneView;
  activationCount: number;
  reduced: boolean;
  reducedMotion: boolean;
  hoveredProject: number | null;
  onProjectHover?: (index: number | null) => void;
}) {
  const mobile = useThree((state) => state.size.width < 640);
  return (
    <>
      <ProjectSatellites
        view={view}
        mobile={mobile}
        reducedMotion={reducedMotion}
        hoveredProject={hoveredProject}
        onProjectHover={onProjectHover}
      />
      <CommunicationBeam active={view === "contact"} reduced={reduced} reducedMotion={reducedMotion} />
      {!reduced ? <DeepSpaceSignal unlocked={activationCount >= 3} reducedMotion={reducedMotion} /> : null}
    </>
  );
}
