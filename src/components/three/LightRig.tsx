"use client";

import { Environment } from "@react-three/drei";

export type LightRigPreset = "studio" | "rim" | "tech";

export type LightRigProps = {
  preset: LightRigPreset;
  /** Global intensity multiplier (default 1) */
  intensity?: number;
  /** Optional self-hosted HDR under public/ (e.g. "/env/StudioSmall.hdr", ≤2MB). Requires a Suspense boundary above. */
  env?: string;
};

type Slot = { pos: [number, number, number]; color: string; intensity: number };

type PresetSpec = {
  ambient: number;
  key: Slot;
  fill: Slot;
  accent: Slot;
};

const PRESETS: Record<LightRigPreset, PresetSpec> = {
  // Classic three-point: neutral warm key, cool fill, white back/rim
  studio: {
    ambient: 0.35,
    key: { pos: [4, 6, 2], color: "#fff5eb", intensity: 1.1 },
    fill: { pos: [-4, 2, -1], color: "#cdd7ff", intensity: 0.35 },
    accent: { pos: [0, 3, -5], color: "#ffffff", intensity: 0.5 },
  },
  // sen-3d-resume: warm key vs cool fill
  rim: {
    ambient: 0.15,
    key: { pos: [4, 6, 2], color: "#ffd9c6", intensity: 1.15 },
    fill: { pos: [-4, 2, -2], color: "#9fc6ff", intensity: 0.4 },
    accent: { pos: [0, 3, -5], color: "#ffffff", intensity: 0.55 },
  },
  // kobin dark-tech brand: matches the wave1 hero lights exactly
  tech: {
    ambient: 0.28,
    key: { pos: [4, 6, 2], color: "#e0f2fe", intensity: 0.95 },
    fill: { pos: [-3.2, -1.5, -2], color: "#818cf8", intensity: 0.45 },
    accent: { pos: [2.5, 2.2, 1.5], color: "#22d3ee", intensity: 0.25 },
  },
};

export function LightRig({ preset, intensity = 1, env }: LightRigProps) {
  const p = PRESETS[preset];
  return (
    <>
      <ambientLight intensity={p.ambient * intensity} />
      <directionalLight
        position={p.key.pos}
        intensity={p.key.intensity * intensity}
        color={p.key.color}
      />
      <pointLight
        position={p.fill.pos}
        intensity={p.fill.intensity * intensity}
        color={p.fill.color}
      />
      <pointLight
        position={p.accent.pos}
        intensity={p.accent.intensity * intensity}
        color={p.accent.color}
      />
      {env ? <Environment files={env} /> : null}
    </>
  );
}
