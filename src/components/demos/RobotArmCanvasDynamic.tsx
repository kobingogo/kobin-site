"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

const Canvas = dynamic(
  () => import("./RobotArmCanvas").then((m) => m.RobotArmCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[min(62vh,520px)] min-h-[280px] w-full items-center justify-center rounded-2xl border border-cyan-500/20 bg-slate-950"
        data-testid="robot-arm-canvas-loading"
      >
        <p className="font-mono text-xs text-zinc-500">加载机械臂仿真…</p>
      </div>
    ),
  },
);

export function RobotArmCanvasDynamic(
  props: ComponentProps<typeof import("./RobotArmCanvas").RobotArmCanvas>,
) {
  return <Canvas {...props} />;
}
