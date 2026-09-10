"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { HeroScene } from "./HeroScene";

type Props = {
  scrollProgress: number;
  enabled: boolean;
};

export function HeroCanvas({ scrollProgress, enabled }: Props) {
  const [mounted, setMounted] = useState(false);

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
    <div className="pointer-events-none absolute inset-0">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 5.2], fov: 45, near: 0.1, far: 40 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <Suspense fallback={null}>
          <HeroScene scrollProgress={scrollProgress} />
        </Suspense>
      </Canvas>
    </div>
  );
}
