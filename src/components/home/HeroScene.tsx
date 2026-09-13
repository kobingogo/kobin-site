"use client";

import { SpaceExterior } from "@/components/experience/exterior/SpaceExterior";
import type { SceneView } from "@/components/experience/exterior/types";
import type { RenderQuality } from "@/lib/three/quality";

type HeroSceneProps = {
  quality: RenderQuality;
  view: SceneView;
  activationCount: number;
  hoveredProject: number | null;
  eclipseActive: boolean;
  reducedMotion?: boolean;
  onReady?: () => void;
  onActivate?: () => void;
  onProjectHover?: (index: number | null) => void;
  onEclipseAlign?: () => void;
};

/** Persistent homepage scene: optimized orbital-lab GLB in a procedural exterior. */
export function HeroScene({
  quality,
  view,
  activationCount,
  hoveredProject,
  eclipseActive,
  reducedMotion,
  onReady,
  onActivate,
  onProjectHover,
  onEclipseAlign,
}: HeroSceneProps) {
  return (
    <SpaceExterior
      quality={quality}
      view={view}
      activationCount={activationCount}
      hoveredProject={hoveredProject}
      eclipseActive={eclipseActive}
      reducedMotion={reducedMotion}
      onReady={onReady}
      onActivate={onActivate}
      onProjectHover={onProjectHover}
      onEclipseAlign={onEclipseAlign}
    />
  );
}
