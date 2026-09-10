"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import {
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { Vector3, type Group, type Mesh } from "three";
import {
  DEFAULT_QUALITY,
  QUALITY_PROFILES,
  SLOT_POSITIONS,
  type ArmJoints,
  type CubeId,
  type CubeState,
  type QualityProfile,
  type RenderQuality,
  type SlotId,
  type WorldState,
} from "@/lib/robot-arm";

export type RobotArmCanvasProps = {
  world: WorldState;
  /** Display joints (lerped); falls back to world.joints */
  displayJoints?: ArmJoints;
  className?: string;
  onInteractive?: () => void;
  /** Real rAF / useFrame sampled FPS */
  onFps?: (fps: number) => void;
  canvasElRef?: MutableRefObject<HTMLCanvasElement | null>;
  quality?: RenderQuality;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Sample FPS from R3F frame loop (backed by requestAnimationFrame). */
function FpsProbe({ onFps }: { onFps?: (fps: number) => void }) {
  const frames = useRef(0);
  const windowStart = useRef(0);
  useFrame(() => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (windowStart.current === 0) {
      windowStart.current = now;
      frames.current = 0;
      return;
    }
    frames.current += 1;
    const elapsed = now - windowStart.current;
    if (elapsed >= 500) {
      const fps = (frames.current * 1000) / elapsed;
      onFps?.(fps);
      frames.current = 0;
      windowStart.current = now;
    }
  });
  return null;
}

function Table({ profile }: { profile: QualityProfile }) {
  const seg = profile.segments;
  return (
    <group>
      <mesh position={[0, 0.05, 0.35]} receiveShadow={profile.shadows}>
        <boxGeometry args={[2.6, 0.1, 1.4]} />
        <meshStandardMaterial color="#1e293b" metalness={0.2} roughness={0.75} />
      </mesh>
      {(Object.keys(SLOT_POSITIONS) as SlotId[]).map((slot) => {
        const [x, z] = SLOT_POSITIONS[slot];
        return (
          <mesh
            key={slot}
            position={[x, 0.11, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.16, 0.2, Math.max(8, seg)]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.35} />
          </mesh>
        );
      })}
      <mesh position={[1.35, 0.18, -0.15]} receiveShadow={profile.shadows}>
        <boxGeometry args={[0.45, 0.08, 0.45]} />
        <meshStandardMaterial color="#334155" metalness={0.15} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Cubes({
  cubes,
  held,
  gripperWorld,
  profile,
}: {
  cubes: Record<CubeId, CubeState>;
  held: CubeId | null;
  gripperWorld: MutableRefObject<[number, number, number]>;
  profile: QualityProfile;
}) {
  const refs = useRef<Partial<Record<CubeId, Mesh>>>({});

  useFrame(() => {
    for (const id of Object.keys(cubes) as CubeId[]) {
      const mesh = refs.current[id];
      if (!mesh) continue;
      const c = cubes[id];
      if (held === id || c.location === "held") {
        const [gx, gy, gz] = gripperWorld.current;
        mesh.position.set(gx, gy - 0.12, gz);
        mesh.visible = true;
      } else if (c.location === "bin") {
        mesh.position.set(1.35, 0.32, -0.15);
        mesh.visible = true;
      } else {
        const [x, z] = SLOT_POSITIONS[c.location];
        mesh.position.set(x, 0.28, z);
        mesh.visible = true;
      }
    }
  });

  return (
    <group>
      {(Object.keys(cubes) as CubeId[]).map((id) => (
        <mesh
          key={id}
          ref={(m) => {
            if (m) refs.current[id] = m;
          }}
          castShadow={profile.shadows}
        >
          <boxGeometry args={[0.22, 0.22, 0.22]} />
          <meshStandardMaterial
            color={cubes[id].color}
            metalness={0.25}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function Arm({
  joints,
  gripperWorld,
  profile,
}: {
  joints: ArmJoints;
  gripperWorld: MutableRefObject<[number, number, number]>;
  profile: QualityProfile;
}) {
  const baseRef = useRef<Group>(null);
  const shoulderRef = useRef<Group>(null);
  const elbowRef = useRef<Group>(null);
  const wristRef = useRef<Group>(null);
  const display = useRef<ArmJoints>({ ...joints });
  const _wristWorld = useMemo(() => new Vector3(), []);
  const leftJaw = useRef<Mesh>(null);
  const rightJaw = useRef<Mesh>(null);
  const seg = profile.segments;
  const cast = profile.shadows;

  useFrame((_, delta) => {
    const t = Math.min(1, delta * 8);
    display.current = {
      base: lerp(display.current.base, joints.base, t),
      shoulder: lerp(display.current.shoulder, joints.shoulder, t),
      elbow: lerp(display.current.elbow, joints.elbow, t),
      gripper: lerp(display.current.gripper, joints.gripper, t),
    };
    const j = display.current;
    if (baseRef.current) baseRef.current.rotation.y = j.base;
    if (shoulderRef.current) shoulderRef.current.rotation.z = j.shoulder;
    if (elbowRef.current) elbowRef.current.rotation.z = j.elbow;
    if (wristRef.current) {
      wristRef.current.updateWorldMatrix(true, false);
      const v = wristRef.current.getWorldPosition(_wristWorld);
      gripperWorld.current = [v.x, v.y, v.z];
    }
    const g = 0.09 - display.current.gripper * 0.06;
    if (leftJaw.current) leftJaw.current.position.x = -g;
    if (rightJaw.current) rightJaw.current.position.x = g;
  });

  const gap = 0.09 - joints.gripper * 0.06;

  return (
    <group position={[0, 0.1, -0.35]}>
      <mesh position={[0, 0.12, 0]} castShadow={cast}>
        <cylinderGeometry args={[0.28, 0.32, 0.24, seg]} />
        <meshStandardMaterial color="#0f172a" metalness={0.5} roughness={0.35} />
      </mesh>
      <group ref={baseRef} position={[0, 0.24, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow={cast}>
          <cylinderGeometry args={[0.16, 0.18, 0.16, seg]} />
          <meshStandardMaterial
            color="#155e75"
            metalness={0.55}
            roughness={0.3}
          />
        </mesh>
        <group ref={shoulderRef} position={[0, 0.16, 0]}>
          <mesh
            position={[0.35, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow={cast}
          >
            <boxGeometry args={[0.14, 0.7, 0.14]} />
            <meshStandardMaterial
              color="#22d3ee"
              metalness={0.4}
              roughness={0.35}
            />
          </mesh>
          <group ref={elbowRef} position={[0.7, 0, 0]}>
            <mesh
              position={[0.3, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow={cast}
            >
              <boxGeometry args={[0.12, 0.6, 0.12]} />
              <meshStandardMaterial
                color="#67e8f9"
                metalness={0.4}
                roughness={0.35}
              />
            </mesh>
            <group ref={wristRef} position={[0.6, 0, 0]}>
              <mesh castShadow={cast}>
                <boxGeometry args={[0.12, 0.12, 0.12]} />
                <meshStandardMaterial
                  color="#e2e8f0"
                  metalness={0.6}
                  roughness={0.25}
                />
              </mesh>
              <mesh ref={leftJaw} position={[-gap, -0.12, 0]} castShadow={cast}>
                <boxGeometry args={[0.04, 0.18, 0.08]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
              <mesh ref={rightJaw} position={[gap, -0.12, 0]} castShadow={cast}>
                <boxGeometry args={[0.04, 0.18, 0.08]} />
                <meshStandardMaterial
                  color="#fbbf24"
                  metalness={0.5}
                  roughness={0.3}
                />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

function SceneContent({
  world,
  displayJoints,
  onInteractive,
  onFps,
  gripperWorld,
  profile,
}: {
  world: WorldState;
  displayJoints?: ArmJoints;
  onInteractive?: () => void;
  onFps?: (fps: number) => void;
  gripperWorld: MutableRefObject<[number, number, number]>;
  profile: QualityProfile;
}) {
  const ready = useRef(false);
  useEffect(() => {
    if (!ready.current) {
      ready.current = true;
      onInteractive?.();
    }
  }, [onInteractive]);

  const joints = displayJoints ?? world.joints;

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[3, 6, 2]}
        intensity={1.05}
        castShadow={profile.shadows}
        shadow-mapSize-width={profile.shadowMapSize}
        shadow-mapSize-height={profile.shadowMapSize}
      />
      {!profile.shadows && (
        <pointLight position={[-2, 3, -1]} intensity={0.25} color="#67e8f9" />
      )}
      <Table profile={profile} />
      <Arm joints={joints} gripperWorld={gripperWorld} profile={profile} />
      <Cubes
        cubes={world.cubes}
        held={world.held}
        gripperWorld={gripperWorld}
        profile={profile}
      />
      {profile.contactShadows && (
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.35}
          scale={8}
          blur={1.8}
          far={3}
          resolution={256}
        />
      )}
      <OrbitControls
        enablePan={false}
        minPolarAngle={0.4}
        maxPolarAngle={1.35}
        minDistance={2.2}
        maxDistance={5.5}
        target={[0, 0.5, 0.2]}
      />
      <FpsProbe onFps={onFps} />
    </>
  );
}

export function RobotArmCanvas({
  world,
  displayJoints,
  className,
  onInteractive,
  onFps,
  canvasElRef,
  quality = DEFAULT_QUALITY,
}: RobotArmCanvasProps) {
  const gripperWorld = useRef<[number, number, number]>([0, 1, 0]);
  const profile = QUALITY_PROFILES[quality];

  return (
    <div
      className={
        className ??
        "h-[min(62vh,520px)] min-h-[280px] w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950"
      }
      data-testid="robot-arm-canvas"
      data-quality={quality}
    >
      <Canvas
        key={quality}
        shadows={profile.shadows}
        dpr={[1, profile.dprMax]}
        camera={{ position: [2.6, 2.1, 2.8], fov: 42, near: 0.1, far: 40 }}
        gl={{
          antialias: profile.antialias,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
        }}
        frameloop="always"
        onCreated={({ gl }) => {
          if (canvasElRef) canvasElRef.current = gl.domElement;
          gl.setPixelRatio(
            Math.min(
              typeof window !== "undefined" ? window.devicePixelRatio : 1,
              profile.dprMax,
            ),
          );
        }}
      >
        <SceneContent
          world={world}
          displayJoints={displayJoints}
          onInteractive={onInteractive}
          onFps={onFps}
          gripperWorld={gripperWorld}
          profile={profile}
        />
      </Canvas>
    </div>
  );
}
