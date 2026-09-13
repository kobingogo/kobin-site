import type { TimelineKey } from "@/lib/three/timeline";

/**
 * Exterior camera stations. The opening composition leaves copy space on the
 * left while later keys orbit the orbital lab without exposing weak angles.
 */

/** DOM `data-point` anchors, in document order (keys.length = anchors.length + 1). */
export const HERO_ANCHORS = ["about", "works", "contact"] as const;

export const HERO_KEYS: TimelineKey[] = [
  {
    id: "hero",
    pos: [0, 0.25, 7.2],
    look: [0.45, 0.22, 0],
    focus: [1.4, 0.5, 0],
  },
  {
    id: "about",
    pos: [0.72, 0.68, 6.25],
    look: [0.92, 0.3, 0],
    focus: [1.35, 0.52, 0],
  },
  {
    id: "works",
    pos: [-0.62, 1.28, 5.45],
    look: [1.1, 0.38, -0.08],
    focus: [1.32, 0.54, -0.08],
  },
  {
    id: "contact",
    pos: [0.18, 2.08, 5.95],
    look: [0.8, 0.42, 0.05],
    focus: [0.8, 0.42, 0.05],
  },
];

export const HERO_TIMELINE_CONFIG = {
  refLineFrac: 0.3,
  dwell: 0.25,
  damping: 4,
  parallaxDeg: 1.9,
  parallaxEase: 0.08,
} as const;
