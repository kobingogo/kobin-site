"use client";

import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { Suspense, useMemo } from "react";
import type { LightPreset, SphereMaterialSpec } from "@/lib/material-spheres";

type Props = {
  materials: SphereMaterialSpec[];
  light: LightPreset;
  className?: string;
};

function WallBackdrop() {
  return (
    <group position={[0, 0.15, -1.35]}>
      <RoundedBox args={[7.2, 3.4, 0.12]} radius={0.06} smoothness={4}>
        <meshStandardMaterial color="#0b1220" metalness={0.2} roughness={0.85} />
      </RoundedBox>
      {/* subtle grid lines via thin boxes */}
      {[-2.4, -0.8, 0.8, 2.4].map((x) => (
        <mesh key={`v-${x}`} position={[x, 0, 0.07]}>
          <boxGeometry args={[0.02, 3.1, 0.01]} />
          <meshBasicMaterial color="#164e63" transparent opacity={0.45} />
        </mesh>
      ))}
      {[-1.1, 0, 1.1].map((y) => (
        <mesh key={`h-${y}`} position={[0, y, 0.07]}>
          <boxGeometry args={[6.8, 0.02, 0.01]} />
          <meshBasicMaterial color="#164e63" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function SphereWall({ materials }: { materials: SphereMaterialSpec[] }) {
  const layout = useMemo(() => {
    const n = materials.length;
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(n))));
    const rows = Math.ceil(n / cols);
    const gapX = 1.35;
    const gapY = 1.35;
    const startX = -((cols - 1) * gapX) / 2;
    const startY = ((rows - 1) * gapY) / 2 + 0.15;
    return materials.map((mat, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        mat,
        position: [startX + col * gapX, startY - row * gapY, 0] as [
          number,
          number,
          number,
        ],
      };
    });
  }, [materials]);

  return (
    <group>
      {layout.map(({ mat, position }) => (
        <mesh key={mat.id} position={position} castShadow receiveShadow>
          <sphereGeometry args={[0.48, 48, 48]} />
          <meshStandardMaterial
            color={mat.color}
            metalness={mat.metalness}
            roughness={mat.roughness}
            emissive={mat.emissive ?? "#000000"}
            emissiveIntensity={mat.emissiveIntensity ?? 0}
            envMapIntensity={mat.envHint ?? 1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({
  materials,
  light,
}: {
  materials: SphereMaterialSpec[];
  light: LightPreset;
}) {
  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={light.ambient} />
      <directionalLight
        castShadow
        position={light.key.position}
        intensity={light.key.intensity}
        color={light.key.color}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={light.fill.position}
        intensity={light.fill.intensity}
        color={light.fill.color}
      />
      <directionalLight
        position={light.rim.position}
        intensity={light.rim.intensity}
        color={light.rim.color}
      />
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={light.envIntensity} />
      </Suspense>
      <WallBackdrop />
      <SphereWall materials={materials} />
      <ContactShadows
        position={[0, -1.55, 0]}
        opacity={0.55}
        scale={10}
        blur={2.4}
        far={4}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.56, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#050a14" metalness={0.1} roughness={0.95} />
      </mesh>
      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={9}
        maxPolarAngle={Math.PI / 1.85}
        target={[0, 0.1, 0]}
      />
    </>
  );
}

export function MaterialSpheresCanvas({ materials, light, className }: Props) {
  return (
    <div
      className={
        className ??
        "relative h-[min(62vh,520px)] min-h-[280px] w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950"
      }
      data-testid="material-spheres-canvas"
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.55, 5.4], fov: 42, near: 0.1, far: 40 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#020617", 1);
        }}
      >
        <Scene materials={materials} light={light} />
      </Canvas>
    </div>
  );
}
