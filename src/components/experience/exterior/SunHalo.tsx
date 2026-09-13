"use client";

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
  uniform float uReveal;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float radius = length(p * vec2(1.0, 1.72));
    float core = exp(-radius * radius * 290.0);
    float whiteHot = exp(-radius * radius * 128.0);
    float amber = exp(-radius * radius * 16.0);
    float redHalo = exp(-radius * radius * 2.8);
    float horizon = exp(-abs(p.y) * 34.0) * exp(-abs(p.x) * 2.1);
    float rayField = pow(max(0.0, 1.0 - abs(p.x)), 3.0)
      * pow(max(0.0, 1.0 - abs(p.y)), 1.7);
    float rayNoise = mix(0.34, 1.0, hash(floor(atan(p.y, p.x) * 47.0 + uTime * 0.03) * vec2(1.0, 3.1)));
    float rays = rayField * rayNoise * exp(-radius * 1.9) * 0.038;
    float alpha = core + whiteHot * 0.62 + amber * 0.3 + redHalo * 0.09 + horizon * 0.1 + rays;
    alpha *= smoothstep(1.0, 0.78, max(abs(p.x), abs(p.y))) * uReveal;

    vec3 color = vec3(1.0, 0.16, 0.025) * redHalo;
    color += vec3(1.0, 0.48, 0.08) * amber * 0.92;
    color += vec3(1.0, 0.82, 0.42) * whiteHot * 1.1;
    color += vec3(1.0, 0.98, 0.9) * core * 1.55;
    color += vec3(1.0, 0.35, 0.08) * (horizon + rays) * 0.48;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function SunHalo({
  mobile = false,
  wide = false,
  reducedMotion = false,
}: {
  mobile?: boolean;
  wide?: boolean;
  reducedMotion?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uReveal: { value: 0 },
  }), []);

  useFrame(({ clock }) => {
    const reveal = reducedMotion ? 1 : THREE.MathUtils.smoothstep(clock.elapsedTime, 0.75, 3.25);
    if (material.current) {
      material.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
      material.current.uniforms.uReveal.value = reveal;
    }
    if (group.current) {
      const breath = reducedMotion ? 1 : 0.99 + Math.sin(clock.elapsedTime * 0.28) * 0.01;
      group.current.scale.setScalar((0.92 + reveal * 0.08) * breath);
    }
  });

  return (
    <group
      ref={group}
      position={mobile ? [-0.25, -1.32, -8] : [2.15, wide ? -3.48 : -2.75, -8]}
    >
      <mesh scale={mobile ? [8.2, 4.75, 1] : [11.8, 6.35, 1]} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
