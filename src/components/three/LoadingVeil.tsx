"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

export type LoadingVeilProps = {
  label?: string;
  /** ms to hold at 100% before fading (default 400) */
  holdMs?: number;
  /** fade-out duration in ms (default 700) */
  fadeMs?: number;
};

export function LoadingVeil({
  label = "加载中",
  holdMs = 400,
  fadeMs = 700,
}: LoadingVeilProps) {
  const { progress, active } = useProgress();
  const [reached, setReached] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [removed, setRemoved] = useState(false);
  // Peak never regresses — batched loads must not shrink the ring
  const peak = useRef(0);
  peak.current = Math.max(peak.current, Math.min(Math.max(progress, 0), 100));

  // No async assets at all → nothing to veil (procedural scenes)
  const hasActivity = active || peak.current > 0;

  useEffect(() => {
    if (progress >= 100 || (!active && peak.current > 0)) setReached(true);
  }, [progress, active]);

  useEffect(() => {
    if (!reached) return;
    const t1 = setTimeout(() => setHiding(true), holdMs);
    const t2 = setTimeout(() => setRemoved(true), holdMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reached, holdMs, fadeMs]);

  if (removed || !hasActivity) return null;

  const R = 34;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - peak.current / 100);

  return (
    <div
      aria-hidden
      data-testid="loading-veil"
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950 ${
        hiding ? "pointer-events-none" : ""
      }`}
      style={{
        opacity: hiding ? 0 : 1,
        transition: `opacity ${fadeMs}ms ease`,
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 80 80" className="h-16 w-16 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="3"
            className="text-white/10"
            stroke="currentColor"
          />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-cyan-300"
            stroke="currentColor"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        </svg>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-400">
          {label}
        </p>
      </div>
    </div>
  );
}
