import type { TimelineKey } from "@/lib/three/timeline";

/**
 * W1 procedural hero camera — station keys mirroring the wave1 hand-tuned
 * CAM_KEYS, plus per-station DoF focus points. W2 replaces this with the
 * home-world.glb CameraAction track (same scroll pipeline, new key source).
 */

/** DOM `data-point` anchors, in document order (keys.length = anchors.length + 1). */
export const HERO_ANCHORS = ["about", "works", "contact"] as const;

export const HERO_KEYS: TimelineKey[] = [
  {
    id: "hero",
    pos: [0.15, 0.55, 5.4],
    look: [0, 0.05, 0],
    focus: [0, 0.05, 0],
  },
  {
    id: "about",
    pos: [1.35, 0.95, 3.9],
    look: [0.1, 0.15, 0],
    focus: [0, 0.1, 0],
  },
  {
    id: "works",
    pos: [-0.85, 1.45, 2.85],
    look: [0, 0.25, -0.1],
    focus: [0, 0.2, -0.05],
  },
  {
    id: "contact",
    pos: [0.05, 2.55, 1.55],
    look: [0, 0.45, 0.05],
    focus: [0, 0.35, 0],
  },
];

export const HERO_TIMELINE_CONFIG = {
  refLineFrac: 0.3,
  dwell: 0.25,
  damping: 4,
  parallaxDeg: 1.6,
  parallaxEase: 0.08,
} as const;
