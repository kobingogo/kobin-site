"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float ring = exp(-abs(radius - 0.285) * 76.0);
    float inner = exp(-abs(radius - 0.272) * 150.0);
    float rays = pow(max(0.0, sin(angle * 17.0 + sin(angle * 5.0 - uTime * 0.16) * 2.2)), 7.0);
    rays *= smoothstep(0.28, 0.2, abs(radius - 0.31)) * smoothstep(0.18, 0.27, radius);
    float pulse = 0.88 + sin(uTime * 0.65) * 0.12;
    vec3 cold = vec3(0.28, 0.78, 1.0);
    vec3 hot = vec3(1.0, 0.67, 0.3);
    vec3 color = mix(cold, hot, smoothstep(-0.7, 0.8, cos(angle + 0.6)));
    float alpha = (ring * 0.52 + inner * 0.72 + rays * 0.3) * uStrength * pulse;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function EclipseEvent({
  active,
  mobile,
  reducedMotion = false,
}: {
  active: boolean;
  mobile: boolean;
  reducedMotion?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uStrength: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    if (!group.current || !material.current) return;
    const target = active ? 0.72 : 0;
    const strength = THREE.MathUtils.lerp(material.current.uniforms.uStrength.value, target, reducedMotion ? 1 : 0.045);
    material.current.uniforms.uStrength.value = strength;
    material.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    group.current.visible = active || strength > 0.01;
    const scale = (mobile ? 1.2 : 1.55) * (0.94 + strength * 0.06);
    group.current.scale.setScalar(scale);
  });

  return (
    <group ref={group} visible={false} position={mobile ? [0.62, 1.32, -1.15] : [4.45, 0.86, -1.35]}>
      <Billboard>
        <mesh renderOrder={3}>
          <planeGeometry args={[3.8, 3.8]} />
          <shaderMaterial
            ref={material}
            uniforms={uniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </Billboard>
      <pointLight color="#79cfff" intensity={active ? 0.16 : 0} distance={4.2} decay={2} />
    </group>
  );
}
