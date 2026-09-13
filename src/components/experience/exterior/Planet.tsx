"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SUN_DIRECTION } from "./sceneLighting";
import type { SceneView } from "./types";

const DAY_MAP = "/assets/exterior/earth/blue-marble-topography-4096.jpg";
const CLOUD_MAP = "/assets/exterior/earth/clouds-2048.jpg";
const NIGHT_MAP = "/assets/exterior/earth/night-lights-3600.jpg";
const HEIGHT_MAP = "/assets/exterior/earth/elevation-2048.webp";
const NORMAL_MAP = "/assets/exterior/earth/normal-2048.webp";

const earthVertex = /* glsl */ `
  uniform sampler2D uHeightMap;
  uniform float uRelief;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;
  varying vec3 vWorldBitangent;
  varying vec3 vWorldPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    vUv = uv;
    float elevation = texture2D(uHeightMap, uv).r;
    vec3 displaced = position + normal * elevation * uRelief;
    vec3 localTangent = normalize(vec3(-position.z, 0.0, position.x));
    vec3 localBitangent = normalize(cross(normal, localTangent));
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldTangent = normalize(mat3(modelMatrix) * localTangent);
    vWorldBitangent = normalize(mat3(modelMatrix) * localBitangent);
    vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
    vViewNormal = normalize(normalMatrix * normal);
    vViewPosition = (modelViewMatrix * vec4(displaced, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(vViewPosition, 1.0);
  }
`;

const earthFragment = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform sampler2D uCloudMap;
  uniform sampler2D uNormalMap;
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform float uTerrainStrength;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldTangent;
  varying vec3 vWorldBitangent;
  varying vec3 vWorldPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 geometryNormal = normalize(vWorldNormal);
    vec3 reliefNormal = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
    reliefNormal = normalize(vec3(reliefNormal.xy * uTerrainStrength, max(reliefNormal.z, 0.16)));
    mat3 terrainBasis = mat3(normalize(vWorldTangent), normalize(vWorldBitangent), geometryNormal);
    vec3 normal = normalize(terrainBasis * reliefNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(uSunDirection);
    float sun = dot(normal, sunDirection);
    float daylight = smoothstep(-0.1, 0.22, sun);
    float directLight = max(sun, 0.0);

    vec3 day = texture2D(uDayMap, vUv).rgb;
    float luminance = dot(day, vec3(0.2126, 0.7152, 0.0722));
    day = mix(pow(day, vec3(1.08)), vec3(luminance), 0.07);
    vec3 night = texture2D(uNightMap, vUv).rgb;
    float cloudShadow = smoothstep(0.2, 0.78, texture2D(uCloudMap, vUv + vec2(-0.0035, 0.0015)).r);
    float cities = max(max(night.r, night.g), night.b);
    night = pow(night, vec3(1.35)) * vec3(1.0, 0.67, 0.31);

    float ocean = smoothstep(0.025, 0.16, day.b - max(day.r, day.g) * 0.82);
    day = mix(day, day * vec3(0.42, 0.69, 0.96), ocean * 0.42);
    vec3 halfDirection = normalize(sunDirection + viewDirection);
    float oceanGlint = pow(max(dot(normal, halfDirection), 0.0), 118.0) * ocean * daylight;
    float broadGlint = pow(max(dot(geometryNormal, halfDirection), 0.0), 16.0) * ocean * daylight;
    float waterFresnel = pow(1.0 - max(dot(geometryNormal, viewDirection), 0.0), 4.0) * ocean * daylight;

    float viewRim = pow(1.0 - max(dot(normalize(vViewNormal), normalize(-vViewPosition)), 0.0), 2.65);
    float terminator = smoothstep(-0.16, 0.025, sun) * (1.0 - smoothstep(0.025, 0.24, sun));
    vec3 twilight = vec3(1.0, 0.19, 0.025) * terminator * viewRim;
    vec3 surface = day * (0.028 + directLight * 0.98) * daylight;
    surface *= 1.0 - cloudShadow * daylight * 0.24;
    surface += night * (1.0 - daylight) * smoothstep(0.035, 0.42, cities) * (1.0 - cloudShadow * 0.42) * 1.58;
    surface += vec3(0.2, 0.52, 0.92) * broadGlint * 0.2;
    surface += vec3(1.0, 0.83, 0.58) * oceanGlint * 1.86;
    surface += vec3(0.05, 0.24, 0.56) * waterFresnel * 0.4;
    surface += twilight * 0.38;

    gl_FragColor = vec4(surface, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const auroraFragment = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;
  varying vec2 vUv;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    float latitude = smoothstep(0.66, 0.76, vUv.y) * (1.0 - smoothstep(0.91, 0.985, vUv.y));
    float rippleA = sin(vUv.x * 72.0 + sin(vUv.y * 31.0) * 2.5 + uTime * 0.24);
    float rippleB = sin(vUv.x * 39.0 - vUv.y * 46.0 - uTime * 0.16);
    float curtains = smoothstep(0.25, 0.92, rippleA * 0.52 + rippleB * 0.28 + 0.48);
    float rim = pow(1.0 - max(dot(normalize(vViewNormal), normalize(-vViewPosition)), 0.0), 2.2);
    vec3 color = mix(vec3(0.025, 0.48, 0.7), vec3(0.08, 0.78, 0.67), curtains);
    float alpha = latitude * curtains * (0.12 + rim * 0.88) * uStrength;
    gl_FragColor = vec4(color, alpha);
  }
`;

const cloudFragment = /* glsl */ `
  uniform sampler2D uCloudMap;
  uniform vec3 uSunDirection;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    float cloud = texture2D(uCloudMap, vUv).r;
    cloud = smoothstep(0.14, 0.86, cloud);
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(uSunDirection);
    float sun = dot(normal, sunDirection);
    float daylight = smoothstep(-0.13, 0.18, sun);
    float direct = max(sun, 0.0);
    float silver = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.4) * daylight;
    vec3 color = mix(vec3(0.08, 0.12, 0.19), vec3(0.91, 0.96, 1.0), direct);
    color += vec3(0.24, 0.63, 1.0) * silver * 0.36;
    float alpha = cloud * mix(0.06, 0.68, daylight) * (0.58 + silver * 0.28);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const atmosphereVertex = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    vViewNormal = normalize(normalMatrix * normal);
    vViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * vec4(vViewPosition, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform float uStrength;
  uniform float uSoftness;
  uniform vec3 uSunDirection;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vViewNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    vec3 sunDirection = normalize(uSunDirection);
    float viewFacing = abs(dot(normalize(vViewNormal), normalize(-vViewPosition)));
    float rim = pow(1.0 - viewFacing, uSoftness);
    float sun = dot(normal, sunDirection);
    float dayGlow = smoothstep(-0.26, 0.3, sun);
    float sunset = smoothstep(-0.17, -0.005, sun) * (1.0 - smoothstep(-0.005, 0.19, sun));
    float forward = pow(max(dot(viewDirection, -sunDirection), 0.0), 9.0);
    vec3 blue = mix(vec3(0.006, 0.055, 0.28), vec3(0.055, 0.42, 1.0), dayGlow);
    vec3 color = blue + vec3(1.0, 0.27, 0.045) * (sunset * 0.9 + forward * 0.16);
    float alpha = rim * uStrength * (0.1 + dayGlow * 0.9) + rim * sunset * 0.24;
    gl_FragColor = vec4(color, alpha);
  }
`;

const moonVertex = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;
  void main() {
    vObjectPosition = position;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
  }
`;

const moonFragment = /* glsl */ `
  uniform vec3 uSunDirection;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  varying vec3 vObjectPosition;

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }

  void main() {
    vec3 normal = normalize(vWorldNormal);
    vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
    float direct = smoothstep(-0.08, 0.7, dot(normal, normalize(uSunDirection)));
    float detail = noise(normalize(vObjectPosition) * 5.0);
    detail = detail * 0.7 + noise(normalize(vObjectPosition) * 17.0) * 0.3;
    float rim = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.8);
    vec3 rock = mix(vec3(0.13, 0.15, 0.18), vec3(0.42, 0.45, 0.48), detail);
    vec3 color = rock * (0.012 + direct * 0.72);
    color += vec3(0.12, 0.34, 0.68) * rim * direct * 0.18;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Atmosphere({
  radius,
  strength,
  softness,
  shellScale,
}: {
  radius: number;
  strength: number;
  softness: number;
  shellScale: number;
}) {
  const uniforms = useMemo(() => ({
    uStrength: { value: strength },
    uSoftness: { value: softness },
    uSunDirection: { value: SUN_DIRECTION.clone() },
  }), [softness, strength]);
  return (
    <mesh scale={shellScale}>
      <sphereGeometry args={[radius, 128, 80]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

export function Planet({
  reduced = false,
  reducedMotion = false,
  view = "home",
}: {
  reduced?: boolean;
  reducedMotion?: boolean;
  view?: SceneView;
}) {
  const group = useRef<THREE.Group>(null);
  const clouds = useRef<THREE.Mesh>(null);
  const earthMaterial = useRef<THREE.ShaderMaterial>(null);
  const auroraMaterial = useRef<THREE.ShaderMaterial>(null);
  const [dayMap, cloudMap, nightMap, heightMap, normalMap] = useTexture([
    DAY_MAP,
    CLOUD_MAP,
    NIGHT_MAP,
    HEIGHT_MAP,
    NORMAL_MAP,
  ]);
  const earthUniforms = useMemo(() => ({
    uDayMap: { value: dayMap },
    uNightMap: { value: nightMap },
    uCloudMap: { value: cloudMap },
    uHeightMap: { value: heightMap },
    uNormalMap: { value: normalMap },
    uSunDirection: { value: SUN_DIRECTION.clone() },
    uRelief: { value: reduced ? 0.004 : 0.008 },
    uTerrainStrength: { value: reduced ? 0.24 : 0.46 },
    uTime: { value: 0 },
  }), [cloudMap, dayMap, heightMap, nightMap, normalMap, reduced]);
  const cloudUniforms = useMemo(() => ({
    uCloudMap: { value: cloudMap },
    uHeightMap: { value: heightMap },
    uRelief: { value: 0 },
    uSunDirection: { value: SUN_DIRECTION.clone() },
  }), [cloudMap, heightMap]);
  const auroraUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uStrength: { value: 0.1 },
  }), []);

  useEffect(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    cloudMap.colorSpace = THREE.NoColorSpace;
    heightMap.colorSpace = THREE.NoColorSpace;
    normalMap.colorSpace = THREE.NoColorSpace;
    for (const texture of [dayMap, cloudMap, nightMap, heightMap, normalMap]) {
      texture.anisotropy = 8;
      texture.wrapS = THREE.RepeatWrapping;
      texture.needsUpdate = true;
    }
  }, [cloudMap, dayMap, heightMap, nightMap, normalMap]);

  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = 2.28 + (reducedMotion ? 0 : clock.elapsedTime * 0.0014);
    if (clouds.current) clouds.current.rotation.y = reducedMotion ? 0 : clock.elapsedTime * 0.0015;
    if (earthMaterial.current) earthMaterial.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
    if (auroraMaterial.current) {
      auroraMaterial.current.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;
      const target = view === "contact" ? 0.22 : 0;
      auroraMaterial.current.uniforms.uStrength.value = THREE.MathUtils.lerp(
        auroraMaterial.current.uniforms.uStrength.value,
        target,
        0.04,
      );
    }
  });

  return (
    <group ref={group} rotation={[0.02, 0, -0.08]}>
      <mesh>
        <sphereGeometry args={[6.35, reduced ? 64 : 192, reduced ? 40 : 120]} />
        <shaderMaterial ref={earthMaterial} uniforms={earthUniforms} vertexShader={earthVertex} fragmentShader={earthFragment} />
      </mesh>
      <mesh ref={clouds} scale={1.008} renderOrder={1}>
        <sphereGeometry args={[6.35, reduced ? 64 : 160, reduced ? 40 : 100]} />
        <shaderMaterial
          uniforms={cloudUniforms}
          vertexShader={earthVertex}
          fragmentShader={cloudFragment}
          transparent
          depthWrite={false}
        />
      </mesh>
      {!reduced && view === "contact" ? (
        <mesh scale={1.0115} renderOrder={2}>
          <sphereGeometry args={[6.35, 96, 64]} />
          <shaderMaterial
            ref={auroraMaterial}
            uniforms={auroraUniforms}
            vertexShader={earthVertex}
            fragmentShader={auroraFragment}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <Atmosphere radius={6.35} strength={0.82} softness={6.2} shellScale={1.009} />
      {!reduced ? <Atmosphere radius={6.35} strength={0.14} softness={2.4} shellScale={1.022} /> : null}
    </group>
  );
}

export function DistantMoon() {
  const uniforms = useMemo(() => ({ uSunDirection: { value: SUN_DIRECTION.clone() } }), []);

  return (
    <group position={[-4.65, 8.4, -25]} rotation={[0.2, -0.5, 0.1]}>
      <mesh>
        <icosahedronGeometry args={[2.25, 7]} />
        <shaderMaterial uniforms={uniforms} vertexShader={moonVertex} fragmentShader={moonFragment} />
      </mesh>
    </group>
  );
}

useTexture.preload([DAY_MAP, CLOUD_MAP, NIGHT_MAP, HEIGHT_MAP, NORMAL_MAP]);
