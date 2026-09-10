"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Canvas = dynamic(
  () =>
    import("./MaterialSpheresCanvas").then((m) => m.MaterialSpheresCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(62vh,520px)] min-h-[280px] w-full items-center justify-center rounded-2xl border border-cyan-500/20 bg-slate-950"
        data-testid="material-spheres-canvas-loading"
      >
        <p className="font-mono text-xs text-zinc-500">加载 3D 球墙…</p>
      </div>
    ),
  },
);

export function MaterialSpheresCanvasDynamic(
  props: ComponentProps<typeof import("./MaterialSpheresCanvas").MaterialSpheresCanvas>,
) {
  return <Canvas {...props} />;
}
