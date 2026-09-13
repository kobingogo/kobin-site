"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { SUN_LIGHT_POSITION } from "./sceneLighting";

export function ExteriorLighting({ eclipseActive = false, reducedMotion = false }: { eclipseActive?: boolean; reducedMotion?: boolean }) {
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const earth = useRef<THREE.DirectionalLight>(null);
  const cabin = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const mix = reducedMotion ? 1 : 0.045;
    const set = (light: THREE.Light | null, value: number) => {
      if (light) light.intensity = THREE.MathUtils.lerp(light.intensity, value, mix);
    };
    set(ambient.current, eclipseActive ? 0.01 : 0.022);
    set(hemisphere.current, eclipseActive ? 0.025 : 0.075);
    set(key.current, eclipseActive ? 0.045 : 1.22);
    set(fill.current, eclipseActive ? 0.025 : 0.38);
    set(rim.current, eclipseActive ? 1.9 : 1.48);
    set(earth.current, eclipseActive ? 0.13 : 0.58);
    set(cabin.current, eclipseActive ? 0.22 : 0.46);
  });

  return (
    <>
      <ambientLight ref={ambient} color="#4f7192" intensity={0.022} />
      <hemisphereLight ref={hemisphere} args={["#6fc7ff", "#010205", 0.075]} />
      <directionalLight ref={key} position={SUN_LIGHT_POSITION} color="#fff0da" intensity={1.22} />
      <directionalLight ref={fill} position={[2.5, 3.5, 8]} color="#b8d9ef" intensity={0.38} />
      <directionalLight ref={rim} position={[-7, 2.2, -8]} color="#3d9cff" intensity={1.48} />
      <directionalLight ref={earth} position={[-1.5, -8, 6]} color="#287eae" intensity={0.58} />
      <pointLight ref={cabin} position={[4.5, 0.4, 2.2]} color="#ff963d" intensity={0.46} distance={8} decay={2.2} />
    </>
  );
}
