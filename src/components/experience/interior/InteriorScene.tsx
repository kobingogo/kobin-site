"use client";

import { Center, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { ExperiencePhase, StationId } from "@/lib/experience-flow";

const AIRLOCK_URL = "/assets/interior/docking-airlock.glb";
const GUIDE_ROBOT_URL = "/assets/interior/guide-robot.glb";
const HOLOGRAPHIC_DISPLAY_URL = "/assets/interior/holographic-display.glb";

export function preloadAirlock() {
  useGLTF.preload(AIRLOCK_URL, true, true);
}

export function preloadLabInterior() {
  useGLTF.preload(GUIDE_ROBOT_URL, true, true);
  useGLTF.preload(HOLOGRAPHIC_DISPLAY_URL, true, true);
}

function cloneModel(scene: THREE.Group) {
  const model = scene.clone(true);
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const next = materials.map((material) => {
      const cloned = material.clone();
      if (cloned instanceof THREE.MeshStandardMaterial) {
        cloned.envMapIntensity = 0.72;
        cloned.roughness = Math.max(0.3, cloned.roughness);
      }
      return cloned;
    });
    object.material = Array.isArray(object.material) ? next : next[0];
    object.castShadow = false;
    object.receiveShadow = false;
  });
  return model;
}

function AssetModel({
  url,
  scale,
  rotation = [0, 0, 0],
  onReady,
}: {
  url: string;
  scale: number;
  rotation?: [number, number, number];
  onReady?: () => void;
}) {
  const { scene } = useGLTF(url, true, true);
  const model = useMemo(() => cloneModel(scene), [scene]);
  useEffect(() => onReady?.(), [model, onReady]);
  return (
    <Center>
      <primitive object={model} scale={scale} rotation={rotation} />
    </Center>
  );
}

function AirlockLights({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    group.current.children.forEach((child, index) => {
      const light = child as THREE.PointLight;
      light.intensity = 0.65 + Math.sin(clock.elapsedTime * 4.5 - index * 0.75) * 0.28;
    });
  });
  return (
    <group ref={group}>
      {[-2.1, -0.7, 0.7, 2.1].map((x) => (
        <pointLight key={x} position={[x, 1.45, 1]} color="#f6b65c" intensity={0.7} distance={3.2} decay={2} />
      ))}
    </group>
  );
}

export function AirlockScene({
  reducedMotion = false,
  onReady,
}: {
  reducedMotion?: boolean;
  onReady?: () => void;
}) {
  const leftDoor = useRef<THREE.Mesh>(null);
  const rightDoor = useRef<THREE.Mesh>(null);
  const elapsed = useRef(0);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    camera.position.set(0, 0.1, 6.4);
    camera.lookAt(0, 0, -1.2);
  }, [camera]);

  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.1);
    const p = reducedMotion ? 1 : THREE.MathUtils.smoothstep(elapsed.current, 0.35, 2.55);
    camera.position.z = THREE.MathUtils.lerp(6.4, 3.75, p);
    camera.lookAt(0, 0, -1.4);
    const aperture = THREE.MathUtils.smoothstep(p, 0.48, 0.9);
    if (leftDoor.current) leftDoor.current.position.x = -0.72 - aperture * 1.24;
    if (rightDoor.current) rightDoor.current.position.x = 0.72 + aperture * 1.24;
  });

  return (
    <>
      <color attach="background" args={["#01050b"]} />
      <fog attach="fog" args={["#020713", 4, 14]} />
      <ambientLight intensity={0.28} color="#a9d7e6" />
      <directionalLight position={[3, 4, 5]} intensity={1.25} color="#8ddfff" />
      <AirlockLights reducedMotion={reducedMotion} />

      <group position={[0, -0.05, -1.8]}>
        <AssetModel url={AIRLOCK_URL} scale={5.1} onReady={onReady} />
      </group>

      {[-0.2, -1.4, -2.6, -3.8].map((z, index) => (
        <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[2.85 - index * 0.08, 0.022, 6, 72]} />
          <meshBasicMaterial color={index % 2 ? "#ffb45c" : "#75e4ff"} transparent opacity={0.34 - index * 0.045} toneMapped={false} />
        </mesh>
      ))}

      <group position={[0, 0, 0.2]}>
        <mesh ref={leftDoor} position={[-0.72, 0, 0]}>
          <boxGeometry args={[1.42, 4.5, 0.12]} />
          <meshStandardMaterial color="#07111b" metalness={0.82} roughness={0.3} emissive="#062938" emissiveIntensity={0.35} />
        </mesh>
        <mesh ref={rightDoor} position={[0.72, 0, 0]}>
          <boxGeometry args={[1.42, 4.5, 0.12]} />
          <meshStandardMaterial color="#07111b" metalness={0.82} roughness={0.3} emissive="#062938" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.075]}>
          <ringGeometry args={[0.68, 0.72, 64]} />
          <meshBasicMaterial color="#9cecff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

function Corridor() {
  return (
    <group>
      <mesh position={[0, -1.78, -1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 18]} />
        <meshStandardMaterial color="#030811" metalness={0.78} roughness={0.5} />
      </mesh>
      <gridHelper args={[18, 30, "#164657", "#081c28"]} position={[0, -1.765, -1.5]} />
      <mesh position={[0, 2.7, -4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 18]} />
        <meshStandardMaterial color="#02050a" metalness={0.7} roughness={0.58} side={THREE.DoubleSide} />
      </mesh>
      {[-5.4, -2.7, 0, 2.7, 5.4].map((x) => (
        <group key={x} position={[x, 0, -3.6]}>
          <mesh>
            <boxGeometry args={[0.045, 8, 0.08]} />
            <meshBasicMaterial color="#1b718a" transparent opacity={0.42} />
          </mesh>
          <pointLight position={[0, 1.7, 1.2]} intensity={0.34} distance={5} color="#63dff8" />
        </group>
      ))}
      {[0.2, -2.1, -4.4, -6.7].map((z) => (
        <mesh key={z} position={[0, 0.45, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.9, 0.018, 4, 96]} />
          <meshBasicMaterial color="#154a5e" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

function StationBeacon({ station, active }: { station: StationId; active: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const phase = ["about", "agent-dod-gate", "material-spheres", "product-turntable", "robot-arm", "contact"].indexOf(station);
  const angle = -0.95 + phase * 0.38;
  const x = Math.sin(angle) * 4.2;
  const z = -4.6 - Math.cos(angle) * 0.55;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const target = active ? 1.22 : 0.72;
    ref.current.scale.lerp(new THREE.Vector3(target, target, target), 0.08);
    ref.current.rotation.z = clock.elapsedTime * (active ? 0.32 : 0.08);
  });
  return (
    <group ref={ref} position={[x, 1.35, z]}>
      <mesh>
        <octahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color={active ? "#ffd078" : "#75ddf7"} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.008, 4, 48]} />
        <meshBasicMaterial color={active ? "#ffb45c" : "#39b9dd"} transparent opacity={active ? 0.78 : 0.28} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LabInteriorScene({
  phase,
  station,
  reducedMotion = false,
}: {
  phase: ExperiencePhase;
  station: StationId | null;
  reducedMotion?: boolean;
}) {
  const robot = useRef<THREE.Group>(null);
  const display = useRef<THREE.Group>(null);
  const camera = useThree((state) => state.camera);
  const pointer = useThree((state) => state.pointer);
  const target = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    camera.position.set(0, 0.2, 7.2);
    camera.lookAt(0, 0, -1.4);
  }, [camera]);

  useFrame(({ clock }, delta) => {
    const stationShift = phase === "station" || phase === "comms" ? 0.35 : 0;
    target.set(
      (reducedMotion ? 0 : pointer.x * 0.16) + stationShift,
      0.22 + (reducedMotion ? 0 : pointer.y * 0.07),
      phase === "map" ? 7.75 : 7.2,
    );
    camera.position.lerp(target, 1 - Math.exp(-Math.min(delta, 0.1) * 2.6));
    camera.lookAt(0, 0.05, -1.5);
    if (robot.current) {
      robot.current.position.y = -0.72 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.75) * 0.055);
      robot.current.rotation.y = -0.3 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.28) * 0.08);
    }
    if (display.current && !reducedMotion) display.current.rotation.y = 0.35 + Math.sin(clock.elapsedTime * 0.24) * 0.055;
  });

  const stationIds: StationId[] = ["about", "agent-dod-gate", "material-spheres", "product-turntable", "robot-arm", "contact"];

  return (
    <>
      <color attach="background" args={["#01040a"]} />
      <fog attach="fog" args={["#020711", 7, 18]} />
      <ambientLight intensity={0.34} color="#b8dce8" />
      <directionalLight position={[2.5, 4, 5]} intensity={1.1} color="#8bdcf4" />
      <directionalLight position={[-4, 2, 1]} intensity={0.65} color="#ffb35a" />
      <Corridor />

      <group ref={robot} position={[-2.6, -0.72, -0.7]} rotation={[0, -0.3, 0]}>
        <AssetModel url={GUIDE_ROBOT_URL} scale={2.45} />
        <pointLight position={[0, 1.2, 0.8]} color="#73e5ff" intensity={1.1} distance={3.2} decay={2} />
        <mesh position={[0, -1.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.58, 0.62, 64]} />
          <meshBasicMaterial color="#5adcf7" transparent opacity={phase === "welcome" ? 0.7 : 0.28} toneMapped={false} />
        </mesh>
      </group>

      <group ref={display} position={[2.35, -0.35, -1.15]} rotation={[0, 0.35, 0]}>
        <AssetModel url={HOLOGRAPHIC_DISPLAY_URL} scale={2.75} />
        <pointLight position={[0, 1.05, 0.5]} color={phase === "comms" ? "#ffb65b" : "#6ee7ff"} intensity={1.25} distance={3.4} decay={2} />
        <mesh position={[0, 0.78, 0.18]}>
          <planeGeometry args={[1.9, 0.92]} />
          <meshBasicMaterial color={phase === "comms" ? "#b56a23" : "#0b7e9f"} transparent opacity={0.17} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>

      {stationIds.map((id) => (
        <StationBeacon key={id} station={id} active={station === id} />
      ))}
    </>
  );
}
