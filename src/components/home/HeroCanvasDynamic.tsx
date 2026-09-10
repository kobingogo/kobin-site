"use client";

import dynamic from "next/dynamic";

export const HeroCanvasDynamic = dynamic(
  () => import("./HeroCanvas").then((m) => m.HeroCanvas),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-black" /> },
);
