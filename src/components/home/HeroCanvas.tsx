"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, startTransition, useCallback, useEffect, useRef, useState } from "react";
import { LoadingVeil } from "@/components/three/LoadingVeil";
import { QualityGuard } from "@/components/three/QualityGuard";
import type { RenderQuality } from "@/lib/three/quality";
import type { SceneView } from "@/components/experience/exterior/types";
import { SceneInterface } from "@/components/experience/exterior/SceneInterface";
import { HeroScene } from "./HeroScene";
import { SceneLifecycle } from "./SceneLifecycle";

type Props = {
  enabled: boolean;
  reducedMotion?: boolean;
};

// Keep renderer configuration stable when FPS telemetry updates React state.
const CAMERA = { position: [-3, 2.2, 22.2] as [number, number, number], fov: 42, near: 0.1, far: 180 };
// Render straight to the default framebuffer. This avoids a full-screen
// offscreen composition pass over the animated canvas.
const GL = {
  antialias: true,
  alpha: false,
  depth: true,
  stencil: false,
  powerPreference: "high-performance" as const,
};
const DPR: [number, number] = [1, 1.5];

export function HeroCanvas({ enabled, reducedMotion = false }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tier, setTier] = useState<RenderQuality>("balanced");
  const [fps, setFps] = useState<number | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [view, setView] = useState<SceneView>("home");
  const [activationCount, setActivationCount] = useState(0);
  const [hoveredProject, setHoveredProject] = useState<number | null>(null);
  const [eclipseActive, setEclipseActive] = useState(false);
  const eclipseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSceneReady = useCallback(() => setSceneReady(true), []);
  const onViewChange = useCallback((next: SceneView) => {
    setHoveredProject(null);
    setEclipseActive(false);
    if (eclipseTimer.current) clearTimeout(eclipseTimer.current);
    setView(next);
  }, []);
  const onActivate = useCallback(() => setActivationCount((count) => count + 1), []);
  const onEclipseAlign = useCallback(() => {
    setEclipseActive(true);
    if (eclipseTimer.current) clearTimeout(eclipseTimer.current);
    eclipseTimer.current = setTimeout(() => setEclipseActive(false), reducedMotion ? 4000 : 6800);
  }, [reducedMotion]);
  const onTierChange = useCallback((next: RenderQuality) => {
    // Keep the already visible scene mounted while the replacement LOD loads.
    startTransition(() => setTier(next));
  }, []);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (eclipseTimer.current) clearTimeout(eclipseTimer.current);
    };
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
      className="absolute inset-0 touch-none"
      data-testid="hero-canvas"
      data-tier={tier}
      data-fps-source="raf"
      data-fps={fps ?? ""}
      data-fps-target="30"
      data-fps-meets={fps !== null && fps >= 30 ? "true" : "false"}
      data-scene-ready={sceneReady ? "true" : "false"}
      data-scene-view={view}
      data-project-focus={hoveredProject ?? ""}
      data-core-state={activationCount > 0 ? "online" : "standby"}
      data-anomaly-state={activationCount >= 3 ? "detected" : "quiet"}
      data-eclipse-state={eclipseActive ? "active" : "idle"}
    >
      <Canvas
        dpr={DPR}
        gl={GL}
        camera={CAMERA}
      >
        <SceneLifecycle />
        <Suspense fallback={null}>
          <HeroScene
            quality={tier}
            view={view}
            activationCount={activationCount}
            hoveredProject={hoveredProject}
            eclipseActive={eclipseActive}
            reducedMotion={reducedMotion}
            onReady={onSceneReady}
            onActivate={onActivate}
            onProjectHover={setHoveredProject}
            onEclipseAlign={onEclipseAlign}
          />
        </Suspense>
        {sceneReady ? <QualityGuard tier={tier} onTierChange={onTierChange} onFps={setFps} /> : null}
      </Canvas>
      <SceneInterface
        view={view}
        activationCount={activationCount}
        hoveredProject={hoveredProject}
        eclipseActive={eclipseActive}
        onViewChange={onViewChange}
        onProjectHover={setHoveredProject}
      />
      <LoadingVeil label="加载轨道外景" holdMs={220} fadeMs={520} />
    </div>
  );
}
