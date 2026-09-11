"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PostFX } from "@/components/three/PostFX";
import { QualityGuard } from "@/components/three/QualityGuard";
import type { RenderQuality } from "@/lib/three/quality";
import { HeroScene } from "./HeroScene";

type Props = {
  scrollProgress: number;
  enabled: boolean;
};

export function HeroCanvas({ scrollProgress, enabled }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tier, setTier] = useState<RenderQuality>("high");
  const [fps, setFps] = useState<number | null>(null);
  const focusRef = useRef(new THREE.Vector3(0, 0.05, 0));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !enabled) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0e7490_0%,_#020617_55%,_#000_100%)]"
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid="hero-canvas"
      data-tier={tier}
      data-fps-source="raf"
      data-fps={fps ?? ""}
      data-fps-target="30"
      data-fps-meets={fps !== null && fps >= 30 ? "true" : "false"}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 5.2], fov: 45, near: 0.1, far: 40 }}
      >
        <Suspense fallback={null}>
          <HeroScene scrollProgress={scrollProgress} focusRef={focusRef} />
        </Suspense>
        <PostFX
          tier={tier}
          focusRef={focusRef}
          bloom={{ intensity: 0.7, luminanceThreshold: 0.45 }}
        />
        <QualityGuard tier={tier} onTierChange={setTier} onFps={setFps} />
      </Canvas>
    </div>
  );
}
