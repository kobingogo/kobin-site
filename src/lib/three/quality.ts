/** Shared render-quality tiers — 3D capability design §6. */

export type RenderQuality = "high" | "balanced" | "low";

export type TierSpec = {
  id: RenderQuality;
  label: string;
  /** Max device pixel ratio */
  dprMax: number;
  /** Post-processing chain on/off */
  postFx: boolean;
  /** Depth-of-field autofocus on/off */
  dof: boolean;
  shadows: boolean;
  shadowMapSize: number;
};

export const TIERS: Record<RenderQuality, TierSpec> = {
  high: {
    id: "high",
    label: "高画质",
    dprMax: 2,
    postFx: true,
    dof: true,
    shadows: true,
    shadowMapSize: 2048,
  },
  balanced: {
    id: "balanced",
    label: "均衡（≥30fps）",
    dprMax: 1.5,
    postFx: true,
    dof: false,
    shadows: true,
    shadowMapSize: 1024,
  },
  low: {
    id: "low",
    label: "流畅优先",
    dprMax: 1,
    postFx: false,
    dof: false,
    shadows: false,
    shadowMapSize: 512,
  },
};

export const FPS_TARGET = 30;
/** Consecutive sub-target FPS samples before an automatic downgrade */
export const DEGRADE_AFTER_SAMPLES = 3;

/** One-way downgrade (never auto-upgrade, per design). */
export function nextTierDown(tier: RenderQuality): RenderQuality | null {
  if (tier === "high") return "balanced";
  if (tier === "balanced") return "low";
  return null;
}
