"use client";

import { BackSide } from "three";

export function DeepSpaceBackdrop() {
  return (
    <mesh renderOrder={-100} frustumCulled={false}>
      <sphereGeometry args={[145, 32, 16]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        vertexShader={`varying vec3 vDirection;
          void main() {
            vDirection = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`}
        fragmentShader={`varying vec3 vDirection;
          void main() {
            vec3 d = normalize(vDirection);
            float band = exp(-pow(dot(d, normalize(vec3(0.7, 1.0, 0.3))) * 7.0, 2.0));
            float dust = 0.5 + 0.25 * sin(d.x * 23.0 + sin(d.z * 31.0))
              + 0.25 * sin(d.y * 49.0 + d.z * 17.0);
            gl_FragColor = vec4(vec3(0.0002, 0.0004, 0.0009)
              + vec3(0.0015, 0.0023, 0.0038) * band * dust, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`}
      />
    </mesh>
  );
}
