"use client";

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { useFrame } from "@react-three/fiber";
import {
  Component,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import { TIERS, type RenderQuality } from "@/lib/three/quality";

export type PostFXProps = {
  tier: RenderQuality;
  /** World-space autofocus target, written per-frame by CameraTimeline */
  focusRef?: MutableRefObject<THREE.Vector3>;
  dof?: { bokehScale?: number; focusRange?: number } | false;
  bloom?: { intensity?: number; luminanceThreshold?: number };
  /** GLSL vignette — keep off where a DOM readability vignette already exists */
  vignette?: boolean;
};

const DEFAULT_DOF = { bokehScale: 3.5, focusRange: 0.8 };
const DEFAULT_BLOOM = { intensity: 0.7, luminanceThreshold: 0.45 };

/** Old GPUs may fail composer setup — degrade silently to raw render, never white-screen. */
class PostFXBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.warn(
      "[three/PostFX] effect chain failed; rendering without post-processing",
      error,
    );
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function PostFX({
  tier,
  focusRef,
  dof,
  bloom,
  vignette = false,
}: PostFXProps) {
  const spec = TIERS[tier];
  const dofRef = useRef<DepthOfFieldEffect | null>(null);
  const d = dof === false ? DEFAULT_DOF : { ...DEFAULT_DOF, ...dof };
  const b = { ...DEFAULT_BLOOM, ...bloom };

  useFrame(() => {
    const e = dofRef.current;
    if (!e || !spec.dof) return;
    if (focusRef && e.target) e.target.copy(focusRef.current);
    e.bokehScale = d.bokehScale;
    const coc = e.cocMaterial;
    if (coc) coc.focusRange = Math.max(1e-4, d.focusRange);
  });

  if (!spec.postFx) return null;

  return (
    <PostFXBoundary>
      <EffectComposer multisampling={0} stencilBuffer={false} depthBuffer>
        {spec.dof && dof !== false ? (
          <DepthOfField
            ref={dofRef}
            target={[0, 0.05, 0]}
            bokehScale={d.bokehScale}
            height={480}
          />
        ) : null}
        <Bloom
          mipmapBlur
          intensity={b.intensity}
          luminanceThreshold={b.luminanceThreshold}
          luminanceSmoothing={0.3}
        />
        <SMAA />
        {vignette ? <Vignette offset={0.28} darkness={0.62} /> : null}
      </EffectComposer>
    </PostFXBoundary>
  );
}
