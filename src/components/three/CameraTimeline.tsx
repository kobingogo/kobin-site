"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  sampleKeys,
  stationIndex,
  type TimelineKey,
} from "@/lib/three/timeline";

export type CameraTimelineProps = {
  /** Station camera keys; keys.length must equal anchors.length + 1 (keys[0] = opening shot). */
  keys: TimelineKey[];
  /** `data-point` values of the DOM anchor sections, in document order. */
  anchors: string[];
  /** Viewport fraction for the reference line (default 0.3). */
  refLineFrac?: number;
  /** Per-segment dwell fraction 0..0.49 (default 0.25). */
  dwell?: number;
  /** Damping λ for the eased continuous index (default 4). */
  damping?: number;
  /** Mouse parallax arc in degrees; 0 disables (default 0). */
  parallaxDeg?: number;
  /** Parallax easing factor per second (sen-style, default 0.08). */
  parallaxEase?: number;
  /** Scales camera-to-focus distance; >1 pulls back (W2 sets 1.2 on touch devices). Default 1. */
  pullback?: number;
  /** Shared world-space focus output for DoF autofocus. */
  focusRef: MutableRefObject<THREE.Vector3>;
};

export function CameraTimeline({
  keys,
  anchors,
  refLineFrac = 0.3,
  dwell = 0.25,
  damping = 4,
  parallaxDeg = 0,
  parallaxEase = 0.08,
  pullback = 1,
  focusRef,
}: CameraTimelineProps) {
  const sSmooth = useRef(-1);
  const mouse = useRef({ x: 0, y: 0 });
  const smouse = useRef({ x: 0, y: 0 });
  const anchorEls = useRef<Element[] | null>(null);
  const sample = useMemo(
    () =>
      ({
        pos: [0, 0, 0],
        look: [0, 0, 0],
        focus: [0, 0, 0],
      }) as {
        pos: [number, number, number];
        look: [number, number, number];
        focus: [number, number, number];
      },
    [],
  );
  const tmp = useMemo(
    () => ({
      euler: new THREE.Euler(0, 0, 0, "YXZ"),
      quat: new THREE.Quaternion(),
      vec: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(() => {
    if (parallaxDeg <= 0) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallaxDeg]);

  useFrame((state, dt) => {
    if (keys.length < 2) return;
    if (!anchorEls.current || anchorEls.current.length !== anchors.length) {
      anchorEls.current = anchors
        .map((a) => document.querySelector(`[data-point="${a}"]`))
        .filter((el): el is Element => !!el);
      if (anchorEls.current.length !== anchors.length) return; // anchors not mounted yet — retry next frame
    }
    const els = anchorEls.current;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const refLine = scrollY + vh * refLineFrac;
    const tops = els.map((el) => el.getBoundingClientRect().top + scrollY);

    const sTarget = stationIndex({
      tops,
      scrollY,
      vh,
      refLine,
      refLineFrac,
      dwell,
    });
    sSmooth.current = THREE.MathUtils.damp(sSmooth.current, sTarget, damping, dt);
    sampleKeys(keys, sSmooth.current, sample);

    const cam = state.camera;
    cam.position.set(sample.pos[0], sample.pos[1], sample.pos[2]);
    focusRef.current.set(sample.focus[0], sample.focus[1], sample.focus[2]);

    if (pullback !== 1) {
      // Scale camera-to-focus distance (mobile framing aid; W2 sets 1.2 on touch)
      tmp.vec
        .copy(cam.position)
        .sub(focusRef.current)
        .multiplyScalar(pullback)
        .add(focusRef.current);
      cam.position.copy(tmp.vec);
    }

    if (parallaxDeg > 0) {
      const ease = Math.min(Math.max(parallaxEase, 0.001), 0.999);
      const me = 1 - Math.pow(ease, dt);
      smouse.current.x += (mouse.current.x - smouse.current.x) * me;
      smouse.current.y += (mouse.current.y - smouse.current.y) * me;
      const ax = THREE.MathUtils.degToRad(parallaxDeg);
      tmp.euler.set(-smouse.current.y * ax, -smouse.current.x * ax, 0);
      tmp.quat.setFromEuler(tmp.euler);
      // Orbit position around the focus so the subject stays pinned while the background parallaxes
      tmp.vec
        .copy(cam.position)
        .sub(focusRef.current)
        .applyQuaternion(tmp.quat)
        .add(focusRef.current);
      cam.position.copy(tmp.vec);
      cam.lookAt(sample.look[0], sample.look[1], sample.look[2]);
      cam.quaternion.premultiply(tmp.quat);
    } else {
      cam.lookAt(sample.look[0], sample.look[1], sample.look[2]);
    }
  });

  return null;
}
