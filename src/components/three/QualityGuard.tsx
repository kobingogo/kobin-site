"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  DEGRADE_AFTER_SAMPLES,
  FPS_TARGET,
  TIERS,
  nextTierDown,
  type RenderQuality,
} from "@/lib/three/quality";

export type QualityGuardProps = {
  /** Current tier — owned by the parent (controlled). */
  tier: RenderQuality;
  onTierChange?: (tier: RenderQuality) => void;
  onFps?: (fps: number) => void;
  fpsTarget?: number;
  /** FPS sampling window in ms (default 500, matches robot-arm FpsProbe). */
  windowMs?: number;
};

/**
 * Samples real rAF-backed FPS from the frame loop and degrades the tier after
 * DEGRADE_AFTER_SAMPLES consecutive sub-target windows. Never upgrades.
 */
export function QualityGuard({
  tier,
  onTierChange,
  onFps,
  fpsTarget = FPS_TARGET,
  windowMs = 500,
}: QualityGuardProps) {
  const frames = useRef(0);
  const windowStart = useRef(0);
  const badStreak = useRef(0);
  const setDpr = useThree((s) => s.setDpr);

  // Clamp dpr to the tier budget whenever the tier changes (incl. initial mount)
  useEffect(() => {
    const deviceDpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    setDpr(Math.min(deviceDpr, TIERS[tier].dprMax));
  }, [tier, setDpr]);

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
    if (elapsed < windowMs) return;
    const fps = (frames.current * 1000) / elapsed;
    frames.current = 0;
    windowStart.current = now;
    onFps?.(fps);

    if (fps < fpsTarget) badStreak.current += 1;
    else badStreak.current = 0;
    if (badStreak.current < DEGRADE_AFTER_SAMPLES) return;
    const next = nextTierDown(tier);
    badStreak.current = 0;
    if (next) onTierChange?.(next);
  });

  return null;
}
