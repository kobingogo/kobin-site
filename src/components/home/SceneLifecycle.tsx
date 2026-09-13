"use client";

import { useThree } from "@react-three/fiber";
import { useEffect, useState } from "react";

export function SceneLifecycle() {
  const canvas = useThree((state) => state.gl.domElement);
  const setFrameloop = useThree((state) => state.setFrameloop);
  const [lost, setLost] = useState(false);
  useEffect(() => {
    const visibility = () => setFrameloop(document.hidden ? "never" : "always");
    const contextLost = (event: Event) => { event.preventDefault(); setLost(true); };
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("webglcontextlost", contextLost);
    visibility();
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("webglcontextlost", contextLost);
    };
  }, [canvas, setFrameloop]);
  if (lost) throw new Error("WebGL context lost; reload required");
  return null;
}
