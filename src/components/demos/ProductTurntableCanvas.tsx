"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
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
  useState,
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
  /** Azimuth (radians) for Playwright drag evidence */
  onAzimuthChange?: (azimuth: number) => void;
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
  onMeshReady,
}: {
  sample: ProductSample;
  mode: RenderMode;
  autoSpin: boolean;
  onMeshReady?: () => void;
}) {
  const group = useRef<Group>(null);
  const readyFired = useRef(false);
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

  useEffect(() => {
    if (readyFired.current) return;
    readyFired.current = true;
    const id = requestAnimationFrame(() => onMeshReady?.());
    return () => cancelAnimationFrame(id);
  }, [map, onMeshReady]);

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

/**
 * TTI = mount → controls + textured mesh ready (canvas interactive).
 * Fires once when both OrbitControls and product texture mesh are ready.
 */
function InteractiveGate({
  meshReady,
  controlsReady,
  onInteractive,
}: {
  meshReady: boolean;
  controlsReady: boolean;
  onInteractive?: () => void;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current || !meshReady || !controlsReady) return;
    fired.current = true;
    const id = requestAnimationFrame(() => onInteractive?.());
    return () => cancelAnimationFrame(id);
  }, [meshReady, controlsReady, onInteractive]);
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

function AzimuthReporter({
  controlsRef,
  onAzimuthChange,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  onAzimuthChange?: (azimuth: number) => void;
}) {
  const last = useRef<number | null>(null);
  useFrame(() => {
    const c = controlsRef.current;
    if (!c || !onAzimuthChange) return;
    const a = c.getAzimuthalAngle();
    if (last.current == null || Math.abs(a - last.current) > 0.0005) {
      last.current = a;
      onAzimuthChange(a);
    }
  });
  return null;
}

function Scene({
  sample,
  mode,
  autoSpin,
  onTextureError,
  canvasElRef,
  onAzimuthChange,
  onControlsReady,
  onMeshReady,
}: Omit<Props, "className" | "onInteractive"> & {
  onControlsReady?: () => void;
  onMeshReady?: () => void;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const controlsSignaled = useRef(false);

  useEffect(() => {
    if (controlsSignaled.current) return;
    // OrbitControls mounts synchronously with the scene; signal next frame.
    const id = requestAnimationFrame(() => {
      if (controls.current) {
        controlsSignaled.current = true;
        onControlsReady?.();
      }
    });
    return () => cancelAnimationFrame(id);
  }, [onControlsReady]);

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        castShadow
        position={[3.2, 4.5, 2.8]}
        intensity={1.45}
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
      {/* Local lights only — no CDN Environment HDR (keeps TTI deterministic & <3s) */}
      <Suspense fallback={null}>
        <TextureErrorBoundary
          onError={onTextureError}
          key={`${sample.id}-${mode}`}
        >
          <ProductMesh
            sample={sample}
            mode={mode}
            autoSpin={autoSpin}
            onMeshReady={onMeshReady}
          />
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
        makeDefault
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
      <AzimuthReporter
        controlsRef={controls}
        onAzimuthChange={onAzimuthChange}
      />
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
  onAzimuthChange,
}: Props) {
  const sceneKey = `${sample.id}-${mode}-${sample.texturePath}`;
  const [meshReady, setMeshReady] = useState(false);
  const [controlsReady, setControlsReady] = useState(false);
  const [azimuth, setAzimuth] = useState(0);

  // Reset readiness when product/mode remounts
  useEffect(() => {
    setMeshReady(false);
    setControlsReady(false);
  }, [sceneKey]);

  const handleAzimuth = (a: number) => {
    setAzimuth(a);
    onAzimuthChange?.(a);
  };

  return (
    <div
      className={
        className ??
        "relative h-[min(62vh,520px)] min-h-[280px] w-full touch-none overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950"
      }
      data-testid="product-turntable-canvas"
      data-azimuth={azimuth.toFixed(4)}
      data-interactive={meshReady && controlsReady ? "true" : "false"}
    >
      <InteractiveGate
        meshReady={meshReady}
        controlsReady={controlsReady}
        onInteractive={onInteractive}
      />
      <Canvas
        key={sceneKey}
        shadows
        dpr={[1, 1.5]}
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
          onTextureError={onTextureError}
          canvasElRef={canvasElRef}
          onAzimuthChange={handleAzimuth}
          onControlsReady={() => setControlsReady(true)}
          onMeshReady={() => setMeshReady(true)}
        />
      </Canvas>
    </div>
  );
}
