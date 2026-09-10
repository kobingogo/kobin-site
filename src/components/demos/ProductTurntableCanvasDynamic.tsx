"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Canvas = dynamic(
  () =>
    import("./ProductTurntableCanvas").then((m) => m.ProductTurntableCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(62vh,520px)] min-h-[280px] w-full items-center justify-center rounded-2xl border border-cyan-500/20 bg-slate-950"
        data-testid="product-turntable-canvas-loading"
      >
        <p className="font-mono text-xs text-zinc-500">加载 3D 转盘…</p>
      </div>
    ),
  },
);

export function ProductTurntableCanvasDynamic(
  props: ComponentProps<
    typeof import("./ProductTurntableCanvas").ProductTurntableCanvas
  >,
) {
  return <Canvas {...props} />;
}
