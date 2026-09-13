"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { DEMOS } from "@/lib/demos";
import { HeroCanvasDynamic } from "./HeroCanvasDynamic";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { SpaceCursor } from "./SpaceCursor";

function useWebGLSupport() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      setOk(!!context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

export function HomeExperience() {
  const reduceMotion = !!useReducedMotion();
  const webglOk = useWebGLSupport();

  useEffect(() => {
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black" data-space-cursor-scope data-testid="space-home">
      <SceneErrorBoundary>
        <HeroCanvasDynamic enabled={webglOk} reducedMotion={reduceMotion} />
      </SceneErrorBoundary>

      {!webglOk ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#10334a_0%,_#020617_60%)] p-6">
          <div className="max-w-lg border border-cyan-300/25 bg-slate-950/90 p-6">
            <p className="font-mono text-xs tracking-[0.2em] text-cyan-300">KOBINFLOW / SAFE MODE</p>
            <h1 className="mt-4 text-3xl font-semibold text-white">当前设备无法启动 3D 场景</h1>
            <p className="mt-3 leading-7 text-slate-300">仍可直接进入项目：</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {DEMOS.map((demo) => (
                <Link key={demo.slug} href={demo.href} className="border border-white/10 p-3 text-sm text-zinc-200 hover:border-cyan-300/50">
                  {demo.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <SpaceCursor reducedMotion={reduceMotion} />
    </main>
  );
}
