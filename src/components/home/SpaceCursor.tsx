"use client";

import { useEffect, useRef } from "react";

type CursorMode = "orbit" | "lock" | "drag";
type CursorState = { mode: CursorMode; label: string };

function getCursorState(target: EventTarget | null): CursorState {
  if (!(target instanceof HTMLElement)) return { mode: "orbit", label: "ORBIT" };
  const action = target.closest<HTMLElement>("[data-cursor-label]")?.dataset.cursorLabel;
  if (target.closest("button, a, [role='button']")) return { mode: "lock", label: action ?? "LOCK" };
  if (target instanceof HTMLCanvasElement) {
    if (target.style.cursor === "grabbing") return { mode: "drag", label: "DRAG" };
    if (target.style.cursor === "pointer") return { mode: "lock", label: target.dataset.cursorLabel ?? "SCAN" };
  }
  return { mode: "orbit", label: "ORBIT" };
}

export function SpaceCursor({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const cursor = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    if (!finePointer.matches || !cursor.current || !trail.current) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };
    let frame = 0;
    let visible = false;
    let pressed = false;
    let mode: CursorMode = "orbit";
    let cursorLabel = "ORBIT";

    const render = () => {
      const smoothing = reducedMotion ? 1 : 0.2;
      current.x += (target.x - current.x) * smoothing;
      current.y += (target.y - current.y) * smoothing;
      cursor.current!.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      trail.current!.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      if (Math.abs(target.x - current.x) > 0.08 || Math.abs(target.y - current.y) > 0.08) {
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const setMode = (next: CursorMode, nextLabel: string) => {
      if (!cursor.current || !label.current || (next === mode && nextLabel === cursorLabel)) return;
      mode = next;
      cursorLabel = nextLabel;
      cursor.current.dataset.mode = next;
      label.current.textContent = nextLabel;
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      target.x = event.clientX;
      target.y = event.clientY;
      if (!visible) {
        visible = true;
        cursor.current!.dataset.visible = "true";
        trail.current!.dataset.visible = "true";
        current.x = target.x;
        current.y = target.y;
      }
      if (!pressed) {
        const next = getCursorState(event.target);
        setMode(next.mode, next.label);
      }
      if (!frame) frame = requestAnimationFrame(render);
    };

    const down = () => {
      pressed = true;
      setMode("drag", "DRAG");
      cursor.current!.dataset.pressed = "true";
    };
    const up = (event: PointerEvent) => {
      pressed = false;
      cursor.current!.dataset.pressed = "false";
      const next = getCursorState(event.target);
      setMode(next.mode, next.label);
    };
    const hide = () => {
      visible = false;
      cursor.current!.dataset.visible = "false";
      trail.current!.dataset.visible = "false";
    };

    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("mouseleave", hide);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion]);

  return (
    <>
      <div ref={trail} aria-hidden className="space-cursor-trail" data-visible="false" />
      <div
        ref={cursor}
        aria-hidden
        className="space-cursor"
        data-mode="orbit"
        data-pressed="false"
        data-testid="space-cursor"
        data-visible="false"
      >
        <span className="space-cursor__reticle">
          <span className="space-cursor__arc space-cursor__arc--a" />
          <span className="space-cursor__arc space-cursor__arc--b" />
        </span>
        <span className="space-cursor__dot" />
        <span ref={label} className="space-cursor__label">ORBIT</span>
      </div>
    </>
  );
}
