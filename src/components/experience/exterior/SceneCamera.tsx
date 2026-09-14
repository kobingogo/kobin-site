"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SceneView } from "./types";

const DESKTOP_POSES: Record<SceneView, { position: [number, number, number]; look: [number, number, number] }> = {
  home: { position: [0, 0.22, 8.8], look: [0.35, -0.45, 0] },
  about: { position: [-0.28, 0.58, 7.1], look: [1.0, -0.12, 0] },
  works: { position: [0.5, 0.08, 6.55], look: [1.28, -0.24, -0.08] },
  contact: { position: [-0.42, 0.85, 7.25], look: [0.8, -0.02, 0] },
};

const MOBILE_POSES: Record<SceneView, { position: [number, number, number]; look: [number, number, number] }> = {
  home: { position: [0, 0.42, 9.15], look: [0.15, -0.1, 0] },
  about: { position: [-0.12, 0.58, 8.75], look: [0.25, 0.18, 0] },
  works: { position: [0.3, 0.28, 8.9], look: [0.42, 0.14, 0] },
  contact: { position: [-0.2, 0.72, 8.8], look: [0.25, 0.18, 0] },
};

export function SceneCamera({
  view,
  entryActive = false,
  reducedMotion = false,
  onEclipseAlign,
}: {
  view: SceneView;
  entryActive?: boolean;
  reducedMotion?: boolean;
  onEclipseAlign?: () => void;
}) {
  const mobile = useThree((state) => state.size.width < 640);
  const pointer = useThree((state) => state.pointer);
  const canvas = useThree((state) => state.gl.domElement);
  const elapsed = useRef(0);
  const orbit = useRef({ x: 0, y: 0, zoom: 1 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const aligned = useRef(false);
  const look = useRef(new THREE.Vector3());
  const target = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Euler(0, 0, 0, "YXZ"), []);

  useEffect(() => {
    orbit.current = { x: 0, y: 0, zoom: 1 };
  }, [view]);

  useEffect(() => {
    canvas.style.cursor = "grab";
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      elapsed.current = 6;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      pinchDistance = distance();
      drag.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const move = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size > 1) {
        const nextDistance = distance();
        if (pinchDistance > 0 && nextDistance > 0) {
          orbit.current.zoom = THREE.MathUtils.clamp(orbit.current.zoom * pinchDistance / nextDistance, 0.85, 1.65);
        }
        pinchDistance = nextDistance;
        drag.current = null;
        return;
      }
      if (!drag.current) return;
      orbit.current.x = THREE.MathUtils.clamp(orbit.current.x - (event.clientX - drag.current.x) * 0.003, -0.48, 0.48);
      orbit.current.y = THREE.MathUtils.clamp(orbit.current.y + (event.clientY - drag.current.y) * 0.002, -0.2, 0.2);
      drag.current = { x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      drag.current = [...pointers.values()][0] ?? null;
      pinchDistance = distance();
      canvas.style.cursor = pointers.size ? "grabbing" : "grab";
    };
    const reset = () => {
      orbit.current = { x: 0, y: 0, zoom: 1 };
      elapsed.current = 6;
    };
    const blur = () => { pointers.clear(); drag.current = null; canvas.style.cursor = "grab"; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      elapsed.current = 6;
      orbit.current.zoom = THREE.MathUtils.clamp(orbit.current.zoom + event.deltaY * 0.0005, 0.85, 1.65);
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("lostpointercapture", up);
    canvas.addEventListener("dblclick", reset);
    window.addEventListener("blur", blur);
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("lostpointercapture", up);
      canvas.removeEventListener("dblclick", reset);
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("wheel", wheel);
      canvas.style.cursor = "";
    };
  }, [canvas]);

  useFrame((state, delta) => {
    elapsed.current += Math.min(delta, 0.1);
    const pose = (mobile ? MOBILE_POSES : DESKTOP_POSES)[view];
    if (entryActive) {
      target.set(mobile ? 2.05 : 3.35, mobile ? 1.1 : -0.28, 2.2);
      look.current.set(mobile ? 2.08 : 3.45, mobile ? 1.05 : -0.35, -0.45);
      state.camera.position.lerp(
        target,
        reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 2.8),
      );
      state.camera.lookAt(look.current);
      return;
    }
    const progress = reducedMotion ? 1 : THREE.MathUtils.clamp((elapsed.current - 0.35) / 4.6, 0, 1);
    const approach = 1 - progress * progress * (3 - 2 * progress);
    const parallax = reducedMotion ? 0 : mobile ? 0.015 : 0.055;
    target.set(
      pose.position[0] + pointer.x * parallax - approach * 2.1,
      pose.position[1] + pointer.y * parallax * 0.55 + approach * 1.2,
      pose.position[2] + approach * 12,
    );
    look.current.set(...pose.look);
    target.sub(look.current).multiplyScalar(orbit.current.zoom);
    rotation.set(orbit.current.y, orbit.current.x, 0);
    target.applyEuler(rotation).add(look.current);
    if (elapsed.current < 0.15 && !reducedMotion) state.camera.position.copy(target);
    state.camera.position.lerp(target, reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, 0.1) * 2.4));
    state.camera.lookAt(look.current);
    const eclipseAligned = !entryActive && !mobile && view === "home" && orbit.current.x > 0.36 && Math.abs(orbit.current.y) < 0.16;
    if (eclipseAligned && !aligned.current) onEclipseAlign?.();
    aligned.current = eclipseAligned;
  });

  return null;
}
