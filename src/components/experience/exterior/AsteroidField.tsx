"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = Math.imul(1664525, value) + 1013904223;
    return (value >>> 0) / 4294967296;
  };
}

export function AsteroidField({ reduced = false, reducedMotion = false }: { reduced?: boolean; reducedMotion?: boolean }) {
  const count = reduced ? 10 : 26;
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pointer = useThree((state) => state.pointer);

  useLayoutEffect(() => {
    if (!mesh.current) return;
    const rand = random(7717);
    const color = new THREE.Color();
    for (let index = 0; index < count; index += 1) {
      const side = rand() > 0.42 ? -1 : 1;
      const distance = 4.5 + rand() * 12;
      const angle = -0.95 + rand() * 1.8;
      dummy.position.set(
        side * (3.2 + Math.cos(angle) * distance * 0.55),
        -1.1 + Math.sin(angle) * distance * 0.55 + (rand() - 0.5) * 2.2,
        -1.5 - rand() * 16,
      );
      dummy.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      const scale = 0.04 + Math.pow(rand(), 2.8) * 0.32;
      dummy.scale.set(scale * (0.75 + rand() * 0.5), scale, scale * (0.7 + rand() * 0.65));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(index, dummy.matrix);
      color.setHSL(0.56, 0.05, 0.075 + rand() * 0.075);
      mesh.current.setColorAt(index, color);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [count, dummy]);

  useFrame(({ clock }, delta) => {
    if (!mesh.current || !group.current) return;
    mesh.current.rotation.z = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.025) * 0.018;
    mesh.current.rotation.y += reducedMotion ? 0 : delta * 0.0018;
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, reducedMotion ? 0 : pointer.x * -0.42, 0.025);
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, reducedMotion ? 0 : pointer.y * -0.2, 0.025);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#27313b" roughness={0.93} metalness={0.12} vertexColors />
      </instancedMesh>
    </group>
  );
}
