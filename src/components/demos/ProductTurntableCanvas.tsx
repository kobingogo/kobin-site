"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
  RoundedBox,
  useTexture,
} from "@react-three/drei";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  resolveMeshSize,
  resolveShape,
  resolveTexturePath,
  type ProductSample,
  type RenderMode,
} from "@/lib/product-turntable";

type Props = {
  sample: ProductSample;
  mode: RenderMode;
  autoSpin: boolean;
  className?: string;
  onInteractive?: () => void;
  onTextureError?: () => void;
  /** Ref to the WebGL canvas element for MediaRecorder */
  canvasElRef?: MutableRefObject<HTMLCanvasElement | null>;
};


class TextureErrorBoundary extends Component<
  { children: ReactNode; onError?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function ProductMesh({
  sample,
  mode,
  autoSpin,
}: {
  sample: ProductSample;
  mode: RenderMode;
  autoSpin: boolean;
}) {
  const group = useRef<Group>(null);
  const texPath = resolveTexturePath(sample, mode);
  const shape = resolveShape(sample, mode);
  const size = resolveMeshSize(sample, mode);

  const map = useTexture(texPath);

  useMemo(() => {
    map.colorSpace = "srgb";
    map.needsUpdate = true;
  }, [map]);

  useFrame((_, dt) => {
    if (!autoSpin || !group.current) return;
    group.current.rotation.y += dt * 0.55;
  });

  const mat = (
    <meshStandardMaterial
      map={map}
      metalness={mode === "proxy" ? 0.05 : sample.metalness}
      roughness={mode === "proxy" ? 0.75 : sample.roughness}
      envMapIntensity={0.85}
    />
  );

  return (
    <group ref={group} position={[0, size[1] / 2, 0]}>
      {shape === "cylinder" ? (
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[size[0], size[0] * 0.92, size[1], 48]} />
          {mat}
        </mesh>
      ) : shape === "roundedBox" ? (
        <RoundedBox
          args={[size[0], size[1], size[2]]}
          radius={0.08}
          smoothness={4}
          castShadow
          receiveShadow
        >
          {mat}
        </RoundedBox>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          {mat}
        </mesh>
      )}
    </group>
  );
}

function Stand() {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <circleGeometry args={[1.35, 48]} />
        <meshStandardMaterial
          color="#0b1220"
          metalness={0.35}
          roughness={0.55}
        />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.7, 0.16, 32]} />
        <meshStandardMaterial color="#111827" metalness={0.4} roughness={0.5} />
      </mesh>
    </group>
  );
}

function InteractiveSignal({ onInteractive }: { onInteractive?: () => void }) {
  const fired = useRef(false);
  const { gl } = useThree();
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const id = requestAnimationFrame(() => onInteractive?.());
    return () => cancelAnimationFrame(id);
  }, [gl, onInteractive]);
  return null;
}

function CanvasCapture({
  canvasElRef,
}: {
  canvasElRef?: MutableRefObject<HTMLCanvasElement | null>;
}) {
  const { gl } = useThree();
  useEffect(() => {
    if (!canvasElRef) return;
    canvasElRef.current = gl.domElement;
    return () => {
      if (canvasElRef.current === gl.domElement) canvasElRef.current = null;
    };
  }, [gl, canvasElRef]);
  return null;
}

function Scene({
  sample,
  mode,
  autoSpin,
  onInteractive,
  onTextureError,
  canvasElRef,
}: Omit<Props, "className">) {
  const controls = useRef<OrbitControlsImpl>(null);

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.28} />
      <directionalLight
        castShadow
        position={[3.2, 4.5, 2.8]}
        intensity={1.25}
        color="#ffffff"
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-2.8, 1.5, 1.2]}
        intensity={0.4}
        color="#a5f3fc"
      />
      <directionalLight
        position={[0.2, 2.2, -3.2]}
        intensity={0.55}
        color="#e0e7ff"
      />
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.7} />
        <TextureErrorBoundary onError={onTextureError} key={`${sample.id}-${mode}`}>
          <ProductMesh sample={sample} mode={mode} autoSpin={autoSpin} />
        </TextureErrorBoundary>
      </Suspense>
      <Stand />
      <ContactShadows
        position={[0, 0.005, 0]}
        opacity={0.55}
        scale={8}
        blur={2.2}
        far={3.5}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.18, 0]}
        receiveShadow
      >
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#050a14" metalness={0.1} roughness={0.95} />
      </mesh>
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableZoom
        minDistance={2.4}
        maxDistance={7}
        maxPolarAngle={Math.PI / 1.75}
        target={[0, 0.55, 0]}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.9}
      />
      <InteractiveSignal onInteractive={onInteractive} />
      <CanvasCapture canvasElRef={canvasElRef} />
    </>
  );
}

export function ProductTurntableCanvas({
  sample,
  mode,
  autoSpin,
  className,
  onInteractive,
  onTextureError,
  canvasElRef,
}: Props) {
  const sceneKey = `${sample.id}-${mode}-${sample.texturePath}`;

  return (
    <div
      className={
        className ??
        "relative h-[min(62vh,520px)] min-h-[280px] w-full touch-none overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950"
      }
      data-testid="product-turntable-canvas"
    >
      <Canvas
        key={sceneKey}
        shadows
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
        }}
        camera={{ position: [2.4, 1.6, 3.4], fov: 40, near: 0.1, far: 40 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#020617", 1);
        }}
      >
        <Scene
          sample={sample}
          mode={mode}
          autoSpin={autoSpin}
          onInteractive={onInteractive}
          onTextureError={onTextureError}
          canvasElRef={canvasElRef}
        />
      </Canvas>
    </div>
  );
}
