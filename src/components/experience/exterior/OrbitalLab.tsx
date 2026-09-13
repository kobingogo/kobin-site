"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { SceneView } from "./types";

const MODEL_URLS = {
  high: "/assets/exterior/orbital-lab-lod0.glb",
  balanced: "/assets/exterior/orbital-lab-lod1.glb",
  low: "/assets/exterior/orbital-lab-lod2.glb",
} as const;

export function OrbitalLab({
  mobile = false,
  quality,
  view,
  onReady,
  onActivate,
  reducedMotion = false,
}: {
  mobile?: boolean;
  quality: keyof typeof MODEL_URLS;
  view: SceneView;
  onReady?: () => void;
  onActivate?: () => void;
  reducedMotion?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const accentLight = useRef<THREE.PointLight>(null);
  const scan = useRef<THREE.Mesh>(null);
  const scanMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const latitudeScan = useRef<THREE.Mesh>(null);
  const latitudeMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const powerMaterials = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const hovered = useRef(false);
  const activationStarted = useRef(-10);
  const canvas = useThree((state) => state.gl.domElement);
  const softwareRenderer = useThree(({ gl }) => {
    const context = gl.getContext();
    const debugInfo = context.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(
      context.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
    );
    return /swiftshader|software|llvmpipe/i.test(renderer);
  });
  const modelUrl = softwareRenderer
    ? MODEL_URLS.low
    : mobile && quality === "high"
      ? MODEL_URLS.balanced
      : MODEL_URLS[quality];
  const { scene } = useGLTF(modelUrl, true, true);
  const model = useMemo(() => scene.clone(true), [scene]);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = false;
      object.receiveShadow = false;
      object.frustumCulled = true;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial) {
          if (!material.userData.orbitalDawnGrade) {
            material.color.multiplyScalar(0.72);
            material.userData.orbitalDawnGrade = true;
          }
          material.envMapIntensity = 0.55;
          material.roughness = Math.max(0.36, material.roughness);
        }
      }
    });
    activationStarted.current = -10;
    onReady?.();
  }, [model, onReady]);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const home = view === "home";
    if (mobile) targetPosition.set(home ? 2.15 : 0.72, home ? 1.12 : 0.85, home ? -0.55 : 0);
    else targetPosition.set(home ? 3.55 : 3.05, home ? -0.42 : -0.38, home ? -0.45 : 0);
    const targetScale = mobile ? (home ? 2.55 : 2.15) : (home ? 3.6 : 2.75);
    const entrance = reducedMotion ? 0 : 1 - THREE.MathUtils.smoothstep(clock.elapsedTime, 1.25, 4.25);
    targetPosition.x += entrance * (mobile ? 0.8 : 2.1);
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, targetPosition.x, reducedMotion ? 1 : 0.055);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetPosition.z, reducedMotion ? 1 : 0.055);
    const nextScale = THREE.MathUtils.lerp(group.current.scale.x, targetScale, reducedMotion ? 1 : 0.055);
    group.current.scale.setScalar(nextScale);
    if (!reducedMotion) {
      group.current.rotation.y += delta * 0.009;
      group.current.rotation.z = -0.06 + Math.sin(clock.elapsedTime * 0.08) * 0.012;
    }
    group.current.position.y = targetPosition.y + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.018);
    const activationAge = performance.now() / 1000 - activationStarted.current;
    const activation = activationAge >= 0 && activationAge <= 1
      ? Math.sin(activationAge * Math.PI)
      : 0;
    if (accentLight.current) {
      const target = 0.75 + (hovered.current ? 0.7 : 0) + activation * 1.3;
      accentLight.current.intensity = THREE.MathUtils.lerp(accentLight.current.intensity, target, 0.08);
    }
    if (scan.current && scanMaterial.current) {
      const hoverLevel = hovered.current ? 0.12 : 0;
      scan.current.scale.setScalar(1 + activation * 0.38);
      scanMaterial.current.opacity = hoverLevel + activation * 0.38;
    }
    powerMaterials.current.forEach((material, index) => {
      if (!material) return;
      const wave = THREE.MathUtils.clamp((activationAge - index * 0.09) / 0.34, 0, 1);
      material.opacity = Math.sin(wave * Math.PI) * 0.72;
      material.visible = material.opacity > 0.01;
    });
    if (latitudeScan.current && latitudeMaterial.current) {
      const scanning = view === "about";
      latitudeScan.current.visible = scanning;
      latitudeScan.current.position.y = 0.08 + ((clock.elapsedTime * 0.22) % 1) * 0.86;
      const edgeFade = Math.sin(((latitudeScan.current.position.y - 0.08) / 0.86) * Math.PI);
      latitudeMaterial.current.opacity = scanning ? edgeFade * 0.46 : 0;
    }
  });

  return (
    <group
      ref={group}
      position={mobile ? [2.32, 1.12, -0.55] : [5.65, -0.42, -0.45]}
      rotation={[0.08, -0.34, -0.06]}
      scale={mobile ? 2.55 : 3.6}
      onPointerEnter={(event) => {
        event.stopPropagation();
        hovered.current = true;
        canvas.style.cursor = "pointer";
        canvas.dataset.cursorLabel = "ACTIVATE";
      }}
      onPointerLeave={() => {
        hovered.current = false;
        canvas.style.cursor = "grab";
        delete canvas.dataset.cursorLabel;
      }}
      onClick={(event) => {
        event.stopPropagation();
        activationStarted.current = performance.now() / 1000;
        onActivate?.();
      }}
    >
      <primitive object={model} />
      <pointLight ref={accentLight} position={[0.58, 0.18, 0.75]} color="#ff9d3d" intensity={0.75} distance={3.4} decay={2.2} />
      {[0.22, 0.4, 0.58, 0.76].map((y, index) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={7}>
          <torusGeometry args={[0.5 - Math.abs(0.5 - y) * 0.22, 0.006, 4, 72]} />
          <meshBasicMaterial
            ref={(material) => { powerMaterials.current[index] = material; }}
            color={index % 2 ? "#ffb45c" : "#75e4ff"}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh ref={latitudeScan} rotation={[Math.PI / 2, 0, 0]} visible={false} renderOrder={7}>
        <torusGeometry args={[0.54, 0.008, 4, 72]} />
        <meshBasicMaterial
          ref={latitudeMaterial}
          color="#9cedff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={scan} position={[0, 0, 0.62]} renderOrder={6}>
        <ringGeometry args={[1.12, 1.14, 96]} />
        <meshBasicMaterial
          ref={scanMaterial}
          color="#90eaff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
