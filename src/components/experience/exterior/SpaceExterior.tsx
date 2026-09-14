"use client";

import { useThree } from "@react-three/fiber";
import type { RenderQuality } from "@/lib/three/quality";
import { AsteroidField } from "./AsteroidField";
import { DeepSpaceBackdrop } from "./DeepSpaceBackdrop";
import { DistantNebula } from "./DistantNebula";
import { EclipseEvent } from "./EclipseEvent";
import { ExteriorLighting } from "./ExteriorLighting";
import { OrbitalLab } from "./OrbitalLab";
import { OrbitalTelemetry } from "./OrbitalTelemetry";
import { DistantMoon, Planet } from "./Planet";
import { ProceduralStars } from "./ProceduralStars";
import { SceneCamera } from "./SceneCamera";
import { SceneEvents } from "./SceneEvents";
import { SpaceEnvironment } from "./SpaceEnvironment";
import { StarFlares } from "./StarFlares";
import { SunHalo } from "./SunHalo";
import type { SceneView } from "./types";

export function SpaceExterior({
  quality,
  view,
  activationCount,
  hoveredProject,
  eclipseActive,
  entryActive = false,
  reducedMotion,
  onReady,
  onActivate,
  onProjectHover,
  onEclipseAlign,
}: {
  quality: RenderQuality;
  view: SceneView;
  activationCount: number;
  hoveredProject: number | null;
  eclipseActive: boolean;
  entryActive?: boolean;
  reducedMotion?: boolean;
  onReady?: () => void;
  onActivate?: () => void;
  onProjectHover?: (index: number | null) => void;
  onEclipseAlign?: () => void;
}) {
  const size = useThree((state) => state.size);
  const mobile = size.width < 640;
  const wide = size.width / size.height > 1.55;
  const reduced = mobile || quality === "low";

  return (
    <>
      <color attach="background" args={["#000107"]} />
      <SpaceEnvironment eclipseActive={eclipseActive} reducedMotion={reducedMotion} />
      <DeepSpaceBackdrop />
      {!reduced ? <DistantNebula reducedMotion={reducedMotion} /> : null}
      <ProceduralStars reduced={reduced} reducedMotion={reducedMotion} />
      {!reduced ? <StarFlares reducedMotion={reducedMotion} /> : null}
      {!reduced && view === "home" ? <DistantMoon /> : null}
      <SunHalo mobile={mobile} wide={wide} reducedMotion={reducedMotion} />
      <group position={mobile ? [0, -14.25, -19] : [0, wide ? -19.9 : -18.25, -18]} scale={mobile ? 1.85 : 2.2}>
        <Planet reduced={reduced} reducedMotion={reducedMotion} view={view} />
      </group>
      {view === "home" ? null : <AsteroidField reduced={reduced} reducedMotion={reducedMotion} />}
      <OrbitalTelemetry
        view={view}
        mobile={mobile}
        reduced={reduced}
        reducedMotion={reducedMotion}
        activationKey={activationCount}
      />
      <SceneEvents
        view={view}
        activationCount={activationCount}
        hoveredProject={hoveredProject}
        onProjectHover={onProjectHover}
        reduced={reduced}
        reducedMotion={!!reducedMotion}
      />
      <EclipseEvent active={eclipseActive} mobile={mobile} reducedMotion={reducedMotion} />
      <ExteriorLighting eclipseActive={eclipseActive} reducedMotion={reducedMotion} />
      <OrbitalLab
        mobile={mobile}
        quality={quality}
        view={view}
        onReady={onReady}
        onActivate={onActivate}
        reducedMotion={reducedMotion}
      />
      <SceneCamera view={view} entryActive={entryActive} reducedMotion={reducedMotion} onEclipseAlign={onEclipseAlign} />
    </>
  );
}
