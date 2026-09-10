# kobin-site 3D W1（共享 3D 基建层）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared 3D infrastructure layer (`src/components/three/` + `src/lib/three/`) and wire it into the existing procedural hero — zero new assets, quality jump from lighting/post-processing/camera choreography.

**Architecture:** Pure math (timeline, tiers, asset budget) lives in `src/lib/three/` under node:test; React/three components in `src/components/three/` are business-agnostic (no "素材官" semantics). HeroScene keeps its geometry but swaps inline lights/camera-scrub for `LightRig`/`CameraTimeline`; HeroCanvas shell gains `QualityGuard` + `PostFX` telemetry. Sen-3d-resume techniques ported: dwell remapping, focus-synced DoF, orbit-around-focus mouse parallax, demand-loop film grain, monotonic-peak loading veil.

**Tech Stack:** Next 15 + React 19 + R3F 9.7 + drei 10.7 + three 0.186 (existing); NEW `@react-three/postprocessing@^3.1.1` + `postprocessing` (peer ranges verified compatible: fiber ≥9.7, react ^19, three ≥0.156). Tests: `tsx --test` (node:test) + Playwright chromium.

**Design doc:** `docs/superpowers/specs/2026-09-10-kobin-site-3d-design.md` §3 (W1 scope), §6 (tiers), §7 (tests).

**Conventions (from repo):**
- Unit tests: `node:test` + `assert/strict`, `describe/it`, files co-located as `<name>.test.ts` (see `src/lib/product-turntable.test.ts`).
- Commits: conventional (`feat(three): …`, `test(three): …`).
- Demo pages are NOT touched in W1. Existing 4 e2e specs must pass unmodified.
- `data-testid` / `data-*` attributes are e2e evidence hooks — exact names matter.
- Repo has no `typecheck` script; use `npx tsc --noEmit` and `npm run lint`.

**Key porting decisions (rationale):**
- Hero Canvas switches from `alpha:true` (transparent) to opaque `#020617` scene background: postprocessing's EffectComposer has known black-background artifacts on alpha canvases; page bg is already `#020617`, so this is visually identical. Pattern already used by RobotArmCanvas (`<color attach="background">`).
- `antialias:false` on hero Canvas — SMAA in the post chain replaces MSAA (`multisampling:0`, sen pattern).
- Tier state is owned by the page shell (HeroCanvas), QualityGuard is controlled (`tier` prop + `onTierChange`), applying dpr clamps via R3F `setDpr` (no Canvas remount).
- W1 hero default tier = `high` (flagship DoF visible); QualityGuard auto-degrades within ~1.5s if FPS<30. CI headless runs may land on balanced/low — the e2e asserts tier ∈ {high,balanced,low} and eventual `data-fps-meets="true"`, robust to degrades.
- Parallax reads a window-level `pointermove` listener (the hero canvas wrapper is `pointer-events:none`, so R3F `state.pointer` would never update); filtered to `pointerType === "mouse"`.
- `GrainOverlay` sits at page root (fixed, z-60, multiply) so grain unifies DOM + 3D layers, matching sen. Mounted only when the 3D canvas is enabled.

---

### Task 1: Install post-processing dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install @react-three/postprocessing@^3.1.1 postprocessing
```

- [ ] **Step 2: Verify the dependency tree resolves cleanly**

```bash
npm ls three @react-three/fiber @react-three/postprocessing postprocessing
```

Expected: all four resolve, no `UNMET PEER DEPENDENCY` / `invalid` lines.

- [ ] **Step 3: Sanity-check the exports we will use exist**

```bash
node -e "const p=require('@react-three/postprocessing'); for (const n of ['EffectComposer','DepthOfField','Bloom','SMAA','Vignette']) { if (!p[n]) { console.error('MISSING export: '+n); process.exit(1) } } console.log('exports OK')"
```

Expected: `exports OK`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add @react-three/postprocessing + postprocessing for shared PostFX"
```

---

### Task 2: `src/lib/three/quality.ts` — tier system (TDD)

**Files:**
- Create: `src/lib/three/quality.ts`
- Test: `src/lib/three/quality.test.ts`

Design doc §6: high（dpr≤2 + 全后处理）/ balanced（dpr≤1.5，DoF 关）/ low（dpr 1，无阴影无后处理）；持续 <30fps 自动降档，不自动升档。This module must NOT import from demo libs (infra is business-agnostic; robot-arm keeps its own QUALITY_PROFILES untouched).

- [ ] **Step 1: Write the failing test**

Create `src/lib/three/quality.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEGRADE_AFTER_SAMPLES,
  FPS_TARGET,
  TIERS,
  nextTierDown,
} from "./quality";

describe("three/quality tiers", () => {
  it("tiers degrade high → balanced → low → null", () => {
    assert.equal(nextTierDown("high"), "balanced");
    assert.equal(nextTierDown("balanced"), "low");
    assert.equal(nextTierDown("low"), null);
  });

  it("dpr budget strictly decreases with tier", () => {
    assert.ok(TIERS.high.dprMax > TIERS.balanced.dprMax);
    assert.ok(TIERS.balanced.dprMax > TIERS.low.dprMax);
  });

  it("postFx off only at low; DoF on only at high", () => {
    assert.equal(TIERS.high.postFx, true);
    assert.equal(TIERS.balanced.postFx, true);
    assert.equal(TIERS.low.postFx, false);
    assert.equal(TIERS.high.dof, true);
    assert.equal(TIERS.balanced.dof, false);
    assert.equal(TIERS.low.dof, false);
  });

  it("low tier disables shadows; guard constants match the ≥30fps contract", () => {
    assert.equal(TIERS.low.shadows, false);
    assert.equal(FPS_TARGET, 30);
    assert.equal(DEGRADE_AFTER_SAMPLES, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx --test src/lib/three/quality.test.ts
```

Expected: FAIL — `Cannot find module './quality'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/three/quality.ts`:

```ts
/** Shared render-quality tiers — 3D capability design §6. */

export type RenderQuality = "high" | "balanced" | "low";

export type TierSpec = {
  id: RenderQuality;
  label: string;
  /** Max device pixel ratio */
  dprMax: number;
  /** Post-processing chain on/off */
  postFx: boolean;
  /** Depth-of-field autofocus on/off */
  dof: boolean;
  shadows: boolean;
  shadowMapSize: number;
};

export const TIERS: Record<RenderQuality, TierSpec> = {
  high: {
    id: "high",
    label: "高画质",
    dprMax: 2,
    postFx: true,
    dof: true,
    shadows: true,
    shadowMapSize: 2048,
  },
  balanced: {
    id: "balanced",
    label: "均衡（≥30fps）",
    dprMax: 1.5,
    postFx: true,
    dof: false,
    shadows: true,
    shadowMapSize: 1024,
  },
  low: {
    id: "low",
    label: "流畅优先",
    dprMax: 1,
    postFx: false,
    dof: false,
    shadows: false,
    shadowMapSize: 512,
  },
};

export const FPS_TARGET = 30;
/** Consecutive sub-target FPS samples before an automatic downgrade */
export const DEGRADE_AFTER_SAMPLES = 3;

/** One-way downgrade (never auto-upgrade, per design). */
export function nextTierDown(tier: RenderQuality): RenderQuality | null {
  if (tier === "high") return "balanced";
  if (tier === "balanced") return "low";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx --test src/lib/three/quality.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/three/quality.ts src/lib/three/quality.test.ts
git commit -m "feat(three): shared render-quality tiers with one-way auto-degrade contract"
```

---

### Task 3: `src/lib/three/timeline.ts` — scroll→camera math (TDD)

**Files:**
- Create: `src/lib/three/timeline.ts`
- Test: `src/lib/three/timeline.test.ts`

Ports sen's scroll choreography as pure, three.js-free math: `dwellRemap` (sen Scene.tsx:307-313), `stationIndex` (sen Scene.tsx:314-334, incl. the −1→0 intro segment), `sampleKeys` (smoothstep keyframe blend over pos/look/focus channels). Keys carry per-station **focus** world coords so DoF autofocus works before any GLB exists (design §3 CameraTimeline row).

Station model: `anchors` = M DOM sections; `keys` = M+1 camera stations where `keys[0]` is the opening shot (s=−1) and `keys[i+1]` matches `anchors[i]` (s=i). Continuous index s ∈ [−1, M−1].

- [ ] **Step 1: Write the failing test**

Create `src/lib/three/timeline.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dwellRemap,
  sampleKeys,
  stationIndex,
  type TimelineKey,
} from "./timeline";

const KEYS: TimelineKey[] = [
  { id: "hero", pos: [0, 0, 5], look: [0, 0, 0], focus: [0, 0, 0] },
  { id: "about", pos: [1, 1, 4], look: [0, 0.1, 0], focus: [0, 0.1, 0] },
  { id: "works", pos: [2, 2, 3], look: [0, 0.2, 0], focus: [0, 0.2, 0] },
  { id: "contact", pos: [3, 3, 2], look: [0, 0.3, 0], focus: [0, 0.3, 0] },
];

describe("dwellRemap", () => {
  it("holds at 0 below dwell and at 1 above 1-dwell", () => {
    assert.equal(dwellRemap(0, 0.25), 0);
    assert.equal(dwellRemap(0.2, 0.25), 0);
    assert.equal(dwellRemap(0.8, 0.25), 1);
    assert.equal(dwellRemap(1, 0.25), 1);
  });

  it("is 0.5 at the segment midpoint (symmetric smoothstep)", () => {
    assert.equal(dwellRemap(0.5, 0.25), 0.5);
  });

  it("passes through (clamped) when dwell is 0", () => {
    assert.equal(dwellRemap(0.3, 0), 0.3);
    assert.equal(dwellRemap(-1, 0), 0);
    assert.equal(dwellRemap(2, 0), 1);
  });

  it("is monotonic non-decreasing", () => {
    let prev = -Infinity;
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const v = dwellRemap(t, 0.25);
      assert.ok(v >= prev - 1e-9, `dwellRemap(${t}) regressed`);
      prev = v;
    }
  });
});

describe("stationIndex", () => {
  // anchors at doc-top 800/1600/2400, viewport 1000, ref line at 30% => +300
  const base = { tops: [800, 1600, 2400], vh: 1000, refLineFrac: 0.3, dwell: 0.25 };
  const idx = (scrollY: number) =>
    stationIndex({ ...base, scrollY, refLine: scrollY + 300 });

  it("intro segment: s=-1 at top, s=0 when first anchor reaches the ref line", () => {
    assert.equal(idx(0), -1);
    // heroScroll = 800 - 300 = 500; halfway → dwell(0.5)=0.5
    assert.equal(idx(250), -0.5);
    assert.equal(idx(500), 0);
  });

  it("holds at a station then transitions (dwell)", () => {
    assert.equal(idx(700), 0); // refLine 1000, t=0.25 → dwell edge → 0
    assert.equal(idx(900), 0.5); // refLine 1200, t=0.5
    assert.equal(idx(1100), 1); // refLine 1400, t=0.75 → 1
  });

  it("clamps at the last anchor", () => {
    assert.equal(idx(2100), 2); // refLine = tops[2]
    assert.equal(idx(5000), 2);
  });

  it("returns 0 for empty anchors", () => {
    assert.equal(
      stationIndex({
        tops: [],
        scrollY: 0,
        vh: 1000,
        refLine: 300,
        refLineFrac: 0.3,
        dwell: 0.25,
      }),
      0,
    );
  });
});

describe("sampleKeys", () => {
  const out = { pos: [0, 0, 0], look: [0, 0, 0], focus: [0, 0, 0] };

  it("hits keys exactly at station indices (-1..M-1)", () => {
    sampleKeys(KEYS, -1, out);
    assert.deepEqual(out.pos, [0, 0, 5]);
    sampleKeys(KEYS, 0, out);
    assert.deepEqual(out.pos, [1, 1, 4]);
    sampleKeys(KEYS, 2, out);
    assert.deepEqual(out.pos, [3, 3, 2]);
  });

  it("smoothstep-blends pos/look/focus at midpoints", () => {
    sampleKeys(KEYS, 0.5, out); // halfway between about and works
    assert.deepEqual(out.pos, [1.5, 1.5, 3.5]);
    assert.deepEqual(out.focus, [0, 0.15, 0]);
  });

  it("clamps out-of-range s", () => {
    sampleKeys(KEYS, -5, out);
    assert.deepEqual(out.pos, [0, 0, 5]);
    sampleKeys(KEYS, 99, out);
    assert.deepEqual(out.pos, [3, 3, 2]);
  });

  it("copies through for a single key", () => {
    sampleKeys([KEYS[1]], 0.3, out);
    assert.deepEqual(out.pos, [1, 1, 4]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx --test src/lib/three/timeline.test.ts
```

Expected: FAIL — `Cannot find module './timeline'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/three/timeline.ts`:

```ts
/**
 * Scroll-scrubbed camera timeline — pure math, no three.js (node:test friendly).
 * Ported from sen-3d-resume Scene.tsx: dwell remapping + anchor→station index +
 * smoothstep keyframe sampling over pos/look/focus channels.
 *
 * Station model: `anchors` are M DOM sections; `keys` has M+1 entries where
 * keys[0] is the opening shot (s=-1) and keys[i+1] parks at anchors[i] (s=i).
 * Continuous index s ∈ [-1, M-1].
 */

export type Vec3Tuple = [number, number, number];

export type TimelineKey = {
  id: string;
  pos: Vec3Tuple;
  look: Vec3Tuple;
  /** DoF autofocus target at this station (world space) */
  focus: Vec3Tuple;
};

export type TimelineSample = {
  pos: Vec3Tuple;
  look: Vec3Tuple;
  focus: Vec3Tuple;
};

export type StationIndexInput = {
  /** Document-space tops of the M anchor elements */
  tops: number[];
  scrollY: number;
  vh: number;
  /** Reference line in viewport px: scrollY + vh * refLineFrac */
  refLine: number;
  refLineFrac: number;
  /** Dwell fraction per segment, clamped to [0, 0.49] */
  dwell: number;
};

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/**
 * Dwell remapping: hold at 0 near segment start, hold at 1 near segment end,
 * fast smoothstep transition through the middle. Camera "parks" at stations.
 */
export function dwellRemap(t: number, dwell: number): number {
  const c = clamp01(t);
  const d = Math.min(Math.max(dwell, 0), 0.49);
  if (d <= 0) return c;
  if (c < d) return 0;
  if (c > 1 - d) return 1;
  return smoothstep((c - d) / (1 - 2 * d));
}

/** Continuous station index from measured anchor tops (sen Scene.tsx:314-334). */
export function stationIndex({
  tops,
  scrollY,
  vh,
  refLine,
  refLineFrac,
  dwell,
}: StationIndexInput): number {
  const M = tops.length;
  if (M === 0) return 0;
  if (refLine <= tops[0]) {
    // Intro segment: s=-1 at the very top, s=0 when anchors[0] reaches the ref line
    const heroScroll = Math.max(1, tops[0] - vh * refLineFrac);
    return -1 + dwellRemap(scrollY / heroScroll, dwell);
  }
  if (refLine >= tops[M - 1]) return M - 1;
  for (let i = 0; i < M - 1; i++) {
    if (refLine <= tops[i + 1]) {
      const t = (refLine - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
      return i + dwellRemap(t, dwell);
    }
  }
  return M - 1;
}

/** Sample pos/look/focus at continuous index s ∈ [-1, M-1]; writes into `out`. */
export function sampleKeys(
  keys: TimelineKey[],
  s: number,
  out: TimelineSample,
): void {
  if (keys.length === 0) return;
  if (keys.length === 1) {
    const k = keys[0];
    for (let i = 0; i < 3; i++) {
      out.pos[i] = k.pos[i];
      out.look[i] = k.look[i];
      out.focus[i] = k.focus[i];
    }
    return;
  }
  const segments = keys.length - 1;
  const u = Math.min(Math.max(s + 1, 0), segments);
  const i = Math.min(Math.floor(u), segments - 1);
  const f = smoothstep(u - i);
  const a = keys[i];
  const b = keys[i + 1];
  for (let k = 0; k < 3; k++) {
    out.pos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * f;
    out.look[k] = a.look[k] + (b.look[k] - a.look[k]) * f;
    out.focus[k] = a.focus[k] + (b.focus[k] - a.focus[k]) * f;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx --test src/lib/three/timeline.test.ts
```

Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/three/timeline.ts src/lib/three/timeline.test.ts
git commit -m "feat(three): scroll camera timeline math — dwell remap, station index, key sampling"
```

---

### Task 4: `src/lib/three/assets.ts` registry + `useGlbScene` hook (TDD)

**Files:**
- Create: `src/lib/three/assets.ts`
- Create: `src/components/three/useGlbScene.ts`
- Test: `src/lib/three/assets.test.ts`

Design §3: registry maps asset id → url/size budget/compression/license; consumed by W2 (home-world.glb) and W3 (demo models). W1 ships the mechanism with an empty registry.

- [ ] **Step 1: Write the failing test**

Create `src/lib/three/assets.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSETS,
  budgetSlack,
  getAsset,
  withinBudget,
  type AssetEntry,
} from "./assets";

const entry: AssetEntry = {
  id: "test-world",
  url: "/assets/test-world.glb",
  budgetBytes: 8 * 1024 * 1024,
  compression: "draco",
  license: "self-made (Blender)",
};

describe("three/assets registry", () => {
  it("W1 registry starts empty (populated by W2/W3)", () => {
    assert.equal(ASSETS.length, 0);
  });

  it("getAsset resolves registered ids only", () => {
    assert.equal(getAsset("test-world"), undefined);
  });

  it("withinBudget: at/under budget passes, empty or over fails", () => {
    assert.equal(withinBudget(entry, entry.budgetBytes), true);
    assert.equal(withinBudget(entry, 1024), true);
    assert.equal(withinBudget(entry, entry.budgetBytes + 1), false);
    assert.equal(withinBudget(entry, 0), false);
  });

  it("budgetSlack reports remaining bytes", () => {
    assert.equal(budgetSlack(entry, 1024), entry.budgetBytes - 1024);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx --test src/lib/three/assets.test.ts
```

Expected: FAIL — `Cannot find module './assets'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/three/assets.ts`:

```ts
/** GLB asset registry — single source of truth for 3D assets (url / budget / license). */

export type AssetCompression = "draco" | "meshopt" | "none";

export type AssetEntry = {
  id: string;
  /** public/-relative URL of the GLB */
  url: string;
  /** Hard size budget in bytes (post-compression file on disk) */
  budgetBytes: number;
  compression: AssetCompression;
  /** e.g. "self-made (Blender)" or "CC0 — <source url>" */
  license: string;
  source?: string;
};

/**
 * W1: intentionally empty. W2 registers home-world (≤8MB Draco);
 * W3 registers demo models after license verification (oss-picker).
 */
export const ASSETS: readonly AssetEntry[] = [];

export function getAsset(id: string): AssetEntry | undefined {
  return ASSETS.find((a) => a.id === id);
}

export function withinBudget(entry: AssetEntry, actualBytes: number): boolean {
  return actualBytes > 0 && actualBytes <= entry.budgetBytes;
}

export function budgetSlack(entry: AssetEntry, actualBytes: number): number {
  return entry.budgetBytes - actualBytes;
}
```

Create `src/components/three/useGlbScene.ts`:

```tsx
"use client";

import { useGLTF } from "@react-three/drei";
import { getAsset } from "@/lib/three/assets";

/**
 * Load a GLB registered in the asset registry by id.
 * Throws on unknown ids — registry membership is the license/budget gate.
 */
export function useGlbScene(id: string) {
  const entry = getAsset(id);
  if (!entry) {
    throw new Error(`[three/assets] unknown asset id: ${id}`);
  }
  const gltf = useGLTF(entry.url);
  return { gltf, entry };
}

export function preloadGlb(id: string) {
  const entry = getAsset(id);
  if (entry) useGLTF.preload(entry.url);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx --test src/lib/three/assets.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/three/assets.ts src/lib/three/assets.test.ts src/components/three/useGlbScene.ts
git commit -m "feat(three): GLB asset registry with size budgets + useGlbScene loader"
```

---

### Task 5: `LightRig` component — lighting presets

**Files:**
- Create: `src/components/three/LightRig.tsx`

Presets: `studio` (three-point), `rim` (sen's warm key #ffd9c6 / cool fill #9fc6ff), `tech` (matches current hero lights exactly — ambient 0.28 / #e0f2fe key / #818cf8 fill / #22d3ee accent — so wiring it in is a no-op visually until PostFX lands).

- [ ] **Step 1: Write the component**

Create `src/components/three/LightRig.tsx`:

```tsx
"use client";

import { Environment } from "@react-three/drei";

export type LightRigPreset = "studio" | "rim" | "tech";

export type LightRigProps = {
  preset: LightRigPreset;
  /** Global intensity multiplier (default 1) */
  intensity?: number;
  /** Optional self-hosted HDR under public/ (e.g. "/env/StudioSmall.hdr", ≤2MB). Requires a Suspense boundary above. */
  env?: string;
};

type Slot = { pos: [number, number, number]; color: string; intensity: number };

type PresetSpec = {
  ambient: number;
  key: Slot;
  fill: Slot;
  accent: Slot;
};

const PRESETS: Record<LightRigPreset, PresetSpec> = {
  // Classic three-point: neutral warm key, cool fill, white back/rim
  studio: {
    ambient: 0.35,
    key: { pos: [4, 6, 2], color: "#fff5eb", intensity: 1.1 },
    fill: { pos: [-4, 2, -1], color: "#cdd7ff", intensity: 0.35 },
    accent: { pos: [0, 3, -5], color: "#ffffff", intensity: 0.5 },
  },
  // sen-3d-resume: warm key vs cool fill
  rim: {
    ambient: 0.15,
    key: { pos: [4, 6, 2], color: "#ffd9c6", intensity: 1.15 },
    fill: { pos: [-4, 2, -2], color: "#9fc6ff", intensity: 0.4 },
    accent: { pos: [0, 3, -5], color: "#ffffff", intensity: 0.55 },
  },
  // kobin dark-tech brand: matches the wave1 hero lights exactly
  tech: {
    ambient: 0.28,
    key: { pos: [4, 6, 2], color: "#e0f2fe", intensity: 0.95 },
    fill: { pos: [-3.2, -1.5, -2], color: "#818cf8", intensity: 0.45 },
    accent: { pos: [2.5, 2.2, 1.5], color: "#22d3ee", intensity: 0.25 },
  },
};

export function LightRig({ preset, intensity = 1, env }: LightRigProps) {
  const p = PRESETS[preset];
  return (
    <>
      <ambientLight intensity={p.ambient * intensity} />
      <directionalLight
        position={p.key.pos}
        intensity={p.key.intensity * intensity}
        color={p.key.color}
      />
      <pointLight
        position={p.fill.pos}
        intensity={p.fill.intensity * intensity}
        color={p.fill.color}
      />
      <pointLight
        position={p.accent.pos}
        intensity={p.accent.intensity * intensity}
        color={p.accent.color}
      />
      {env ? <Environment files={env} /> : null}
    </>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. (If drei's `Environment` prop types differ, check `node_modules/@react-three/drei/core/Environment.d.ts` and adjust.)

- [ ] **Step 3: Commit**

```bash
git add src/components/three/LightRig.tsx
git commit -m "feat(three): LightRig lighting presets (studio/rim/tech) + optional HDR env"
```

---

### Task 6: `GrainOverlay` component — film grain finish pass

**Files:**
- Create: `src/components/three/GrainOverlay.tsx`

Port of sen `web/src/ui/NoiseOverlay.tsx`: separate `frameloop="demand"` Canvas throttled to ~1fps via interval `invalidate()`, CSS `mixBlendMode: multiply`, fullscreen fixed. Near-zero cost; unifies DOM + 3D layers.

- [ ] **Step 1: Write the component**

Create `src/components/three/GrainOverlay.tsx`:

```tsx
"use client";

import { Canvas, invalidate, useFrame } from "@react-three/fiber";
import { DoubleSide, Vector2 } from "three";
import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";

const SHADER_VERSION = "grain-v1";
const FRAME_RATE = 1; // grain refreshes ~1x/second

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x)
      + (c - a) * u.y * (1.0 - u.x)
      + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 pixel = gl_FragCoord.xy;
    float frame = uTime;
    float mask = noise(pixel / uResolution.y * 30.0 + 1000.0*hash(vec2(frame * 0.1))) * 0.2;
    mask = smoothstep(0.005, 0.03, mask);
    float b = noise(pixel / uResolution.y * 30.0 + 1000.0*hash(vec2(frame * 0.1))) * 0.2;
    b += noise(pixel / uResolution.y * 60.0 + 1000.0*hash(vec2(frame * 0.2))) * 0.5;
    b = clamp(b, 0.0, 1.0);
    b = smoothstep(0.1, 0.12, b);
    vec3 color = mix(vec3(0.2, 0.4, 0.45), vec3(1.0, 1.4, 1.3), b);
    color += vec3(mask);
    color *= hash(pixel / uResolution.y * 200.0 + 1000.0*hash(vec2(frame * 0.3))) * 4.0;
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function GrainPlane() {
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const resolution = useMemo(() => new Vector2(), []);
  const lastTimeRef = useRef(-999);

  useFrame(({ clock, size }) => {
    if (!materialRef.current) return;
    if (clock.elapsedTime - lastTimeRef.current < (1 / FRAME_RATE) * 0.5) return;
    lastTimeRef.current = clock.elapsedTime;
    materialRef.current.uniforms.uTime.value = clock.elapsedTime % 10000;
    resolution.set(size.width, size.height);
    materialRef.current.uniforms.uResolution.value = resolution;
  });

  // demand mode: periodic invalidate yields slowly flickering grain at ~zero cost
  useEffect(() => {
    const interval = setInterval(() => invalidate(), 1000 / FRAME_RATE);
    return () => clearInterval(interval);
  }, []);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uResolution: { value: resolution } }),
    [resolution],
  );

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        key={SHADER_VERSION}
        ref={materialRef}
        transparent
        depthTest={false}
        depthWrite={false}
        side={DoubleSide}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
}

/** Fullscreen film-grain veil over DOM + 3D (multiply blend, ~1fps demand canvas). */
export function GrainOverlay({
  opacity = 0.35,
  zIndex = 60,
}: {
  opacity?: number;
  zIndex?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div
      aria-hidden
      data-testid="grain-overlay"
      data-grain-version={SHADER_VERSION}
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex,
        mixBlendMode: "multiply",
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%", opacity, pointerEvents: "none" }}
        frameloop="demand"
        camera={{ position: [0, 0, 1] }}
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      >
        <GrainPlane />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. (`vUv` unused in the fragment shader is fine; if any linting complains, delete the `varying` declaration from both shaders.)

- [ ] **Step 3: Commit**

```bash
git add src/components/three/GrainOverlay.tsx
git commit -m "feat(three): GrainOverlay — 1fps demand-canvas film grain finish pass"
```

---

### Task 7: `PostFX` component — DoF autofocus + Bloom + SMAA (+optional Vignette)

**Files:**
- Create: `src/components/three/PostFX.tsx`

Sen chain (`EffectComposer multisampling={0}` → DoF → Bloom(mipmapBlur) → SMAA), plus per-frame DoF autofocus from a shared `focusRef` (sen Scene.tsx:530-570 pattern) and an error boundary for silent degrade on old devices. Vignette is prop-gated (default OFF for the hero — the homepage already has a DOM readability vignette; demo scenes in W3 will enable it).

- [ ] **Step 1: Write the component**

Create `src/components/three/PostFX.tsx`:

```tsx
"use client";

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import { useFrame } from "@react-three/fiber";
import {
  Component,
  useRef,
  type ErrorInfo,
  type MutableRefObject,
  type ReactNode,
} from "react";
import type { DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import { TIERS, type RenderQuality } from "@/lib/three/quality";

export type PostFXProps = {
  tier: RenderQuality;
  /** World-space autofocus target, written per-frame by CameraTimeline */
  focusRef?: MutableRefObject<THREE.Vector3>;
  dof?: { bokehScale?: number; focusRange?: number };
  bloom?: { intensity?: number; luminanceThreshold?: number };
  /** GLSL vignette — keep off where a DOM readability vignette already exists */
  vignette?: boolean;
};

const DEFAULT_DOF = { bokehScale: 3.5, focusRange: 0.8 };
const DEFAULT_BLOOM = { intensity: 0.7, luminanceThreshold: 0.45 };

/** Old GPUs may fail composer setup — degrade silently to raw render, never white-screen. */
class PostFXBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.warn(
      "[three/PostFX] effect chain failed; rendering without post-processing",
      error,
    );
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function PostFX({
  tier,
  focusRef,
  dof,
  bloom,
  vignette = false,
}: PostFXProps) {
  const spec = TIERS[tier];
  const dofRef = useRef<DepthOfFieldEffect | null>(null);
  const d = { ...DEFAULT_DOF, ...dof };
  const b = { ...DEFAULT_BLOOM, ...bloom };

  useFrame(() => {
    const e = dofRef.current;
    if (!e || !spec.dof) return;
    if (focusRef && e.target) e.target.copy(focusRef.current);
    e.bokehScale = d.bokehScale;
    const coc = e.cocMaterial;
    if (coc) coc.focusRange = Math.max(1e-4, d.focusRange);
  });

  if (!spec.postFx) return null;

  return (
    <PostFXBoundary>
      <EffectComposer multisampling={0} stencilBuffer={false} depthBuffer>
        {spec.dof ? (
          <DepthOfField
            ref={dofRef}
            target={[0, 0.05, 0]}
            bokehScale={d.bokehScale}
            height={480}
          />
        ) : null}
        <Bloom
          mipmapBlur
          intensity={b.intensity}
          luminanceThreshold={b.luminanceThreshold}
          luminanceSmoothing={0.3}
        />
        <SMAA />
        {vignette ? <Vignette offset={0.28} darkness={0.62} /> : null}
      </EffectComposer>
    </PostFXBoundary>
  );
}
```

Implementation note: `DepthOfFieldEffect.target` / `.cocMaterial` / `.bokehScale` are runtime-guarded the same way sen does it — if the installed postprocessing minor renames `cocMaterial`, the `if (coc)` guard keeps the chain alive and focusRange stays at the prop default. Verify against `node_modules/postprocessing/types/DepthOfFieldEffect.d.ts` if TS complains.

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/three/PostFX.tsx
git commit -m "feat(three): PostFX chain — DoF autofocus, mipmap Bloom, SMAA, silent-degrade boundary"
```

---

### Task 8: `QualityGuard` component — FPS sampling + one-way degrade

**Files:**
- Create: `src/components/three/QualityGuard.tsx`

Generalizes robot-arm's `FpsProbe` sampling (500ms windows) + adds auto-degrade. Controlled component: parent owns tier; guard reports samples and downgrades via `onTierChange`; dpr clamping uses R3F `setDpr` so no Canvas remount.

- [ ] **Step 1: Write the component**

Create `src/components/three/QualityGuard.tsx`:

```tsx
"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import {
  DEGRADE_AFTER_SAMPLES,
  FPS_TARGET,
  TIERS,
  nextTierDown,
  type RenderQuality,
} from "@/lib/three/quality";

export type QualityGuardProps = {
  /** Current tier — owned by the parent (controlled). */
  tier: RenderQuality;
  onTierChange?: (tier: RenderQuality) => void;
  onFps?: (fps: number) => void;
  fpsTarget?: number;
  /** FPS sampling window in ms (default 500, matches robot-arm FpsProbe). */
  windowMs?: number;
};

/**
 * Samples real rAF-backed FPS from the frame loop and degrades the tier after
 * DEGRADE_AFTER_SAMPLES consecutive sub-target windows. Never upgrades.
 */
export function QualityGuard({
  tier,
  onTierChange,
  onFps,
  fpsTarget = FPS_TARGET,
  windowMs = 500,
}: QualityGuardProps) {
  const frames = useRef(0);
  const windowStart = useRef(0);
  const badStreak = useRef(0);
  const setDpr = useThree((s) => s.setDpr);

  // Clamp dpr to the tier budget whenever the tier changes (incl. initial mount)
  useEffect(() => {
    const deviceDpr =
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    setDpr(Math.min(deviceDpr, TIERS[tier].dprMax));
  }, [tier, setDpr]);

  useFrame(() => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (windowStart.current === 0) {
      windowStart.current = now;
      frames.current = 0;
      return;
    }
    frames.current += 1;
    const elapsed = now - windowStart.current;
    if (elapsed < windowMs) return;
    const fps = (frames.current * 1000) / elapsed;
    frames.current = 0;
    windowStart.current = now;
    onFps?.(fps);

    if (fps < fpsTarget) badStreak.current += 1;
    else badStreak.current = 0;
    if (badStreak.current < DEGRADE_AFTER_SAMPLES) return;
    const next = nextTierDown(tier);
    badStreak.current = 0;
    if (next) onTierChange?.(next);
  });

  return null;
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors. (If `s.setDpr` is not in the v9 `State` types, check `node_modules/@react-three/fiber/dist/declarations/src/core/store.d.ts` — fallback is `useThree((s) => s.set)({ dpr: ... })`.)

- [ ] **Step 3: Commit**

```bash
git add src/components/three/QualityGuard.tsx
git commit -m "feat(three): QualityGuard — rAF FPS sampling, one-way auto-degrade, dpr clamping"
```

---

### Task 9: `CameraTimeline` component — scroll-driven camera engine

**Files:**
- Create: `src/components/three/CameraTimeline.tsx`

Binds the Task 3 math to R3F: measures DOM anchors each frame, damps the continuous index, writes camera pose + shared `focusRef`, adds sen's orbit-around-focus mouse parallax (position AND orientation rotate around the focus so the subject stays pinned). Parallax input is a window-level `pointermove` listener because the hero canvas wrapper is `pointer-events:none`.

- [ ] **Step 1: Write the component**

Create `src/components/three/CameraTimeline.tsx`:

```tsx
"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import {
  sampleKeys,
  stationIndex,
  type TimelineKey,
} from "@/lib/three/timeline";

export type CameraTimelineProps = {
  /** Station camera keys; keys.length must equal anchors.length + 1 (keys[0] = opening shot). */
  keys: TimelineKey[];
  /** `data-point` values of the DOM anchor sections, in document order. */
  anchors: string[];
  /** Viewport fraction for the reference line (default 0.3). */
  refLineFrac?: number;
  /** Per-segment dwell fraction 0..0.49 (default 0.25). */
  dwell?: number;
  /** Damping λ for the eased continuous index (default 4). */
  damping?: number;
  /** Mouse parallax arc in degrees; 0 disables (default 0). */
  parallaxDeg?: number;
  /** Parallax easing factor per second (sen-style, default 0.08). */
  parallaxEase?: number;
  /** Scales camera-to-focus distance; >1 pulls back (W2 sets 1.2 on touch devices). Default 1. */
  pullback?: number;
  /** Shared world-space focus output for DoF autofocus. */
  focusRef: MutableRefObject<THREE.Vector3>;
};

export function CameraTimeline({
  keys,
  anchors,
  refLineFrac = 0.3,
  dwell = 0.25,
  damping = 4,
  parallaxDeg = 0,
  parallaxEase = 0.08,
  pullback = 1,
  focusRef,
}: CameraTimelineProps) {
  const sSmooth = useRef(-1);
  const mouse = useRef({ x: 0, y: 0 });
  const smouse = useRef({ x: 0, y: 0 });
  const anchorEls = useRef<Element[] | null>(null);
  const sample = useMemo(
    () =>
      ({
        pos: [0, 0, 0],
        look: [0, 0, 0],
        focus: [0, 0, 0],
      }) as {
        pos: [number, number, number];
        look: [number, number, number];
        focus: [number, number, number];
      },
    [],
  );
  const tmp = useMemo(
    () => ({
      euler: new THREE.Euler(0, 0, 0, "YXZ"),
      quat: new THREE.Quaternion(),
      vec: new THREE.Vector3(),
    }),
    [],
  );

  useEffect(() => {
    if (parallaxDeg <= 0) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [parallaxDeg]);

  useFrame((state, dt) => {
    if (keys.length < 2) return;
    if (!anchorEls.current || anchorEls.current.length !== anchors.length) {
      anchorEls.current = anchors
        .map((a) => document.querySelector(`[data-point="${a}"]`))
        .filter((el): el is Element => !!el);
      if (anchorEls.current.length !== anchors.length) return; // anchors not mounted yet — retry next frame
    }
    const els = anchorEls.current;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const refLine = scrollY + vh * refLineFrac;
    const tops = els.map((el) => el.getBoundingClientRect().top + scrollY);

    const sTarget = stationIndex({
      tops,
      scrollY,
      vh,
      refLine,
      refLineFrac,
      dwell,
    });
    sSmooth.current = THREE.MathUtils.damp(sSmooth.current, sTarget, damping, dt);
    sampleKeys(keys, sSmooth.current, sample);

    const cam = state.camera;
    cam.position.set(sample.pos[0], sample.pos[1], sample.pos[2]);
    focusRef.current.set(sample.focus[0], sample.focus[1], sample.focus[2]);

    if (pullback !== 1) {
      // Scale camera-to-focus distance (mobile framing aid; W2 sets 1.2 on touch)
      tmp.vec
        .copy(cam.position)
        .sub(focusRef.current)
        .multiplyScalar(pullback)
        .add(focusRef.current);
      cam.position.copy(tmp.vec);
    }

    if (parallaxDeg > 0) {
      const ease = Math.min(Math.max(parallaxEase, 0.001), 0.999);
      const me = 1 - Math.pow(ease, dt);
      smouse.current.x += (mouse.current.x - smouse.current.x) * me;
      smouse.current.y += (mouse.current.y - smouse.current.y) * me;
      const ax = THREE.MathUtils.degToRad(parallaxDeg);
      tmp.euler.set(-smouse.current.y * ax, -smouse.current.x * ax, 0);
      tmp.quat.setFromEuler(tmp.euler);
      // Orbit position around the focus so the subject stays pinned while the background parallaxes
      tmp.vec
        .copy(cam.position)
        .sub(focusRef.current)
        .applyQuaternion(tmp.quat)
        .add(focusRef.current);
      cam.position.copy(tmp.vec);
      cam.lookAt(sample.look[0], sample.look[1], sample.look[2]);
      cam.quaternion.premultiply(tmp.quat);
    } else {
      cam.lookAt(sample.look[0], sample.look[1], sample.look[2]);
    }
  });

  return null;
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/three/CameraTimeline.tsx
git commit -m "feat(three): CameraTimeline — anchor-measured scroll scrub, damped index, focus parallax"
```

---

### Task 10: `LoadingVeil` component — monotonic-peak loading screen

**Files:**
- Create: `src/components/three/LoadingVeil.tsx`

Port of sen `web/src/ui/LoadingScreen.tsx`: `useProgress` peak never regresses; 100% → hold → fade → unmount; renders nothing when no async assets exist (W1 hero is procedural — the veil only becomes visible once W2 registers GLB loads). CSS transition + setTimeout so it stays reliable when backgrounded.

- [ ] **Step 1: Write the component**

Create `src/components/three/LoadingVeil.tsx`:

```tsx
"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";

export type LoadingVeilProps = {
  label?: string;
  /** ms to hold at 100% before fading (default 400) */
  holdMs?: number;
  /** fade-out duration in ms (default 700) */
  fadeMs?: number;
};

export function LoadingVeil({
  label = "加载中",
  holdMs = 400,
  fadeMs = 700,
}: LoadingVeilProps) {
  const { progress, active } = useProgress();
  const [reached, setReached] = useState(false);
  const [hiding, setHiding] = useState(false);
  const [removed, setRemoved] = useState(false);
  // Peak never regresses — batched loads must not shrink the ring
  const peak = useRef(0);
  peak.current = Math.max(peak.current, Math.min(Math.max(progress, 0), 100));

  // No async assets at all → nothing to veil (procedural scenes)
  const hasActivity = active || peak.current > 0;

  useEffect(() => {
    if (progress >= 100 || (!active && peak.current > 0)) setReached(true);
  }, [progress, active]);

  useEffect(() => {
    if (!reached) return;
    const t1 = setTimeout(() => setHiding(true), holdMs);
    const t2 = setTimeout(() => setRemoved(true), holdMs + fadeMs);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reached, holdMs, fadeMs]);

  if (removed || !hasActivity) return null;

  const R = 34;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - peak.current / 100);

  return (
    <div
      aria-hidden
      data-testid="loading-veil"
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-950 ${
        hiding ? "pointer-events-none" : ""
      }`}
      style={{
        opacity: hiding ? 0 : 1,
        transition: `opacity ${fadeMs}ms ease`,
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <svg viewBox="0 0 80 80" className="h-16 w-16 -rotate-90">
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="3"
            className="text-white/10"
            stroke="currentColor"
          />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-cyan-300"
            stroke="currentColor"
            strokeDasharray={C}
            strokeDashoffset={offset}
          />
        </svg>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-zinc-400">
          {label}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/three/LoadingVeil.tsx
git commit -m "feat(three): LoadingVeil — monotonic-peak progress ring with fade-unmount"
```

---

### Task 11: `src/lib/hero-timeline.ts` — hero station data (TDD)

**Files:**
- Create: `src/lib/hero-timeline.ts`
- Test: `src/lib/hero-timeline.test.ts`

The W1 procedural camera path as data — station keys mirror the current hand-tuned CAM_KEYS (`HeroScene.tsx:13-19`) plus per-station focus points. Replaced by `home-world.glb` CameraAction in W2 (same scroll→frame pipeline, only the key source changes).

- [ ] **Step 1: Write the failing test**

Create `src/lib/hero-timeline.test.ts`:

```ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HERO_ANCHORS,
  HERO_KEYS,
  HERO_TIMELINE_CONFIG,
} from "./hero-timeline";

describe("hero timeline data (W1 procedural)", () => {
  it("one key per anchor plus the opening hero key", () => {
    assert.equal(HERO_KEYS.length, HERO_ANCHORS.length + 1);
  });

  it("key ids are unique; every anchor has a matching key", () => {
    const ids = HERO_KEYS.map((k) => k.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const a of HERO_ANCHORS) {
      assert.ok(ids.includes(a), `missing key for anchor ${a}`);
    }
  });

  it("focus points stay near the scene core (readable DoF)", () => {
    for (const k of HERO_KEYS) {
      assert.ok(Math.abs(k.focus[0]) < 1.5);
      assert.ok(Math.abs(k.focus[1]) < 1.5);
      assert.ok(Math.abs(k.focus[2]) < 1.5);
    }
  });

  it("config values are in valid ranges", () => {
    assert.ok(
      HERO_TIMELINE_CONFIG.refLineFrac > 0 && HERO_TIMELINE_CONFIG.refLineFrac < 1,
    );
    assert.ok(HERO_TIMELINE_CONFIG.dwell > 0 && HERO_TIMELINE_CONFIG.dwell < 0.5);
    assert.ok(HERO_TIMELINE_CONFIG.damping > 0);
    assert.ok(
      HERO_TIMELINE_CONFIG.parallaxDeg >= 0 &&
        HERO_TIMELINE_CONFIG.parallaxDeg <= 5,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx --test src/lib/hero-timeline.test.ts
```

Expected: FAIL — `Cannot find module './hero-timeline'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/hero-timeline.ts`:

```ts
import type { TimelineKey } from "@/lib/three/timeline";

/**
 * W1 procedural hero camera — station keys mirroring the wave1 hand-tuned
 * CAM_KEYS, plus per-station DoF focus points. W2 replaces this with the
 * home-world.glb CameraAction track (same scroll pipeline, new key source).
 */

/** DOM `data-point` anchors, in document order (keys.length = anchors.length + 1). */
export const HERO_ANCHORS = ["about", "works", "contact"] as const;

export const HERO_KEYS: TimelineKey[] = [
  {
    id: "hero",
    pos: [0.15, 0.55, 5.4],
    look: [0, 0.05, 0],
    focus: [0, 0.05, 0],
  },
  {
    id: "about",
    pos: [1.35, 0.95, 3.9],
    look: [0.1, 0.15, 0],
    focus: [0, 0.1, 0],
  },
  {
    id: "works",
    pos: [-0.85, 1.45, 2.85],
    look: [0, 0.25, -0.1],
    focus: [0, 0.2, -0.05],
  },
  {
    id: "contact",
    pos: [0.05, 2.55, 1.55],
    look: [0, 0.45, 0.05],
    focus: [0, 0.35, 0],
  },
];

export const HERO_TIMELINE_CONFIG = {
  refLineFrac: 0.3,
  dwell: 0.25,
  damping: 4,
  parallaxDeg: 1.6,
  parallaxEase: 0.08,
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx --test src/lib/hero-timeline.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/hero-timeline.ts src/lib/hero-timeline.test.ts
git commit -m "feat(home): hero station keys + timeline config as data (W1 scrub path)"
```

---

### Task 12: Wire infra into the hero (HeroScene / HeroCanvas / HomeExperience)

**Files:**
- Modify: `src/components/home/HeroScene.tsx` (full rewrite — camera scrub + lights move out)
- Modify: `src/components/home/HeroCanvas.tsx` (full rewrite — shell owns tier/fps/PostFX/QualityGuard)
- Modify: `src/components/home/HomeExperience.tsx` (add `data-point` anchors ×3, mount GrainOverlay)

Geometry/rotations/copy are untouched; what changes: lights → `LightRig preset="tech"`, camera scrub → `CameraTimeline` (dwell parking replaces the constant glide), opaque `#020617` background (EffectComposer/alpha rationale above), PostFX + QualityGuard + telemetry attributes.

- [ ] **Step 1: Rewrite HeroScene**

Replace the entire content of `src/components/home/HeroScene.tsx` with:

```tsx
"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CameraTimeline } from "@/components/three/CameraTimeline";
import { LightRig } from "@/components/three/LightRig";
import {
  HERO_ANCHORS,
  HERO_KEYS,
  HERO_TIMELINE_CONFIG,
} from "@/lib/hero-timeline";

type HeroSceneProps = {
  /** 0–1 scroll progress; drives ambient object motion (camera is owned by CameraTimeline). */
  scrollProgress: number;
  /** Shared DoF autofocus target, written by CameraTimeline each frame. */
  focusRef: MutableRefObject<THREE.Vector3>;
};

/**
 * Dark-tech procedural hero: geo rings + low-poly core + sparse particles.
 * Lighting via shared LightRig(tech); camera via shared CameraTimeline
 * (dwell-parked stations anchored to the content sections).
 * W2 replaces HERO_KEYS with the home-world.glb CameraAction track.
 */
export function HeroScene({ scrollProgress, focusRef }: HeroSceneProps) {
  const core = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const particles = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 360;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.4 + Math.random() * 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const p = scrollProgress;

    if (core.current) {
      core.current.rotation.y = t * 0.1 + p * 0.65;
      core.current.rotation.x = Math.sin(t * 0.18) * 0.06 + p * 0.18;
    }
    if (rings.current) {
      rings.current.rotation.z = t * 0.08;
      rings.current.rotation.y = -t * 0.05 + p * 0.4;
    }
    if (particles.current) {
      particles.current.rotation.y = t * 0.03;
    }
  });

  return (
    <>
      {/* Opaque bg: EffectComposer on alpha canvases has black-artifact pitfalls; page bg is the same #020617 */}
      <color attach="background" args={["#020617"]} />
      <LightRig preset="tech" />

      <group ref={core}>
        <mesh>
          <icosahedronGeometry args={[1.02, 1]} />
          <meshStandardMaterial
            color="#22d3ee"
            wireframe
            transparent
            opacity={0.42}
            emissive="#0e7490"
            emissiveIntensity={0.28}
          />
        </mesh>
        <mesh scale={0.68}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#7c6aaf"
            flatShading
            metalness={0.55}
            roughness={0.32}
            emissive="#312e81"
            emissiveIntensity={0.12}
          />
        </mesh>
      </group>

      <group ref={rings}>
        <mesh rotation={[Math.PI / 2.4, 0.2, 0]}>
          <torusGeometry args={[1.75, 0.012, 8, 96]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.28} />
        </mesh>
        <mesh rotation={[Math.PI / 3.1, -0.35, 0.4]}>
          <torusGeometry args={[2.15, 0.008, 8, 96]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.18} />
        </mesh>
        <mesh rotation={[1.1, 0.5, -0.2]} position={[0, -0.15, 0]}>
          <torusGeometry args={[2.55, 0.006, 6, 72]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.12} />
        </mesh>
      </group>

      {/* Restrained floor grid — dark tech, low contrast */}
      <gridHelper args={[10, 20, "#0e7490", "#0f172a"]} position={[0, -1.35, 0]} />

      <points ref={particles}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.028}
          color="#67e8f9"
          sizeAttenuation
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      </points>

      <CameraTimeline
        keys={HERO_KEYS}
        anchors={[...HERO_ANCHORS]}
        focusRef={focusRef}
        {...HERO_TIMELINE_CONFIG}
      />
    </>
  );
}
```

- [ ] **Step 2: Rewrite HeroCanvas**

Replace the entire content of `src/components/home/HeroCanvas.tsx` with:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PostFX } from "@/components/three/PostFX";
import { QualityGuard } from "@/components/three/QualityGuard";
import type { RenderQuality } from "@/lib/three/quality";
import { HeroScene } from "./HeroScene";

type Props = {
  scrollProgress: number;
  enabled: boolean;
};

export function HeroCanvas({ scrollProgress, enabled }: Props) {
  const [mounted, setMounted] = useState(false);
  const [tier, setTier] = useState<RenderQuality>("high");
  const [fps, setFps] = useState<number | null>(null);
  const focusRef = useRef(new THREE.Vector3(0, 0.05, 0));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !enabled) {
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0e7490_0%,_#020617_55%,_#000_100%)]"
      />
    );
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      data-testid="hero-canvas"
      data-tier={tier}
      data-fps-source="raf"
      data-fps={fps ?? ""}
      data-fps-target="30"
      data-fps-meets={fps !== null && fps >= 30 ? "true" : "false"}
    >
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0.4, 5.2], fov: 45, near: 0.1, far: 40 }}
      >
        <Suspense fallback={null}>
          <HeroScene scrollProgress={scrollProgress} focusRef={focusRef} />
        </Suspense>
        <PostFX
          tier={tier}
          focusRef={focusRef}
          bloom={{ intensity: 0.7, luminanceThreshold: 0.45 }}
        />
        <QualityGuard tier={tier} onTierChange={setTier} onFps={setFps} />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Add anchors + GrainOverlay to HomeExperience**

Three precise edits to `src/components/home/HomeExperience.tsx`:

Edit 1 — import (after the existing `HeroCanvasDynamic` import, line 8):

```tsx
import { GrainOverlay } from "@/components/three/GrainOverlay";
```

Edit 2 — the three section tags gain `data-point` (matching their `id`):

```tsx
<section
  id="about"
  data-point="about"
  className="border-t border-white/5 bg-slate-950/80 px-4 py-16 backdrop-blur-md sm:py-20"
>
```

```tsx
<section
  id="works"
  data-point="works"
  className="border-t border-white/5 bg-black/75 px-4 py-16 backdrop-blur-md sm:py-20"
>
```

```tsx
<section
  id="contact"
  data-point="contact"
  className="border-t border-white/5 bg-slate-950/90 px-4 py-16 backdrop-blur-md sm:py-20"
>
```

Edit 3 — mount grain at the page root so it covers DOM + 3D. Immediately after the closing `</div>` of the fixed canvas layer (the one containing `HeroCanvasDynamic` and the vignette div, after line 56), still inside the root `relative min-h-screen` div:

```tsx
{canvasEnabled && <GrainOverlay opacity={0.35} />}
```

- [ ] **Step 4: Typecheck + lint + unit tests**

```bash
npx tsc --noEmit && npm run lint && npm test
```

Expected: all green (unit tests unaffected; no regressions).

- [ ] **Step 5: Quick manual smoke on dev server**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser: hero renders (opaque dark bg), scrolling parks the camera at about/works/contact instead of gliding constantly, grain visible at 100% zoom, no console errors from three/R3F. If Bloom looks absent, lower `luminanceThreshold` toward 0.3; if halos blow out, raise toward 0.7 (fine-tuning happens in Task 15).

- [ ] **Step 6: Commit**

```bash
git add src/components/home/HeroScene.tsx src/components/home/HeroCanvas.tsx src/components/home/HomeExperience.tsx
git commit -m "feat(home): hero consumes shared 3D infra — LightRig/PostFX/CameraTimeline/QualityGuard/grain"
```

---

### Task 13: Homepage e2e spec + npm script wiring

**Files:**
- Create: `e2e/home-hero.spec.ts`
- Modify: `package.json` (scripts)

W1 scope: smoke + telemetry + anchor/grain evidence + scroll survivability. The 5 formal W2 gates (veil<1.5s, scene-ready<8s, dwell cam-speed, reel) come with the GLB world — not here.

- [ ] **Step 1: Write the spec**

Create `e2e/home-hero.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

/**
 * Home hero — W1 shared 3D infra evidence:
 * - hero canvas mounts with tier + real rAF FPS telemetry
 * - auto-degrade keeps FPS at target (tier may land on any of high/balanced/low)
 * - timeline DOM anchors + grain overlay present
 * - scrolling across anchors keeps the canvas alive (dwell scrub survivability)
 *
 * CI proof: npm run test:e2e:home
 * Prereq: npx playwright install chromium && npm run build
 */

test.describe("home hero (W1 3D infra)", () => {
  test("hero canvas mounts with tier + rAF fps telemetry meeting target", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-fps-source", "raf");
    await expect(canvas).toHaveAttribute("data-fps-target", "30");

    const tier = await canvas.getAttribute("data-tier");
    expect(["high", "balanced", "low"]).toContain(tier);

    // Wait until measured FPS is written
    await expect
      .poll(async () => (await canvas.getAttribute("data-fps")) || "", {
        timeout: 15_000,
      })
      .not.toBe("");

    // Auto-degrade may take up to ~4.5s (3 samples × 500ms per tier × up to 2 steps)
    await expect
      .poll(async () => await canvas.getAttribute("data-fps-meets"), {
        timeout: 25_000,
      })
      .toBe("true");
  });

  test("timeline anchors + grain overlay present; dwell scrub survives scrolling", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-point="about"]')).toHaveCount(1);
    await expect(page.locator('[data-point="works"]')).toHaveCount(1);
    await expect(page.locator('[data-point="contact"]')).toHaveCount(1);

    await expect(page.getByTestId("grain-overlay")).toBeVisible({
      timeout: 15_000,
    });

    // Scroll through all stations and back — canvas must stay mounted
    await page.locator('[data-point="about"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('[data-point="works"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('[data-point="contact"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(page.getByTestId("hero-canvas")).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await expect(page.getByTestId("hero-canvas")).toBeVisible();
  });
});
```

- [ ] **Step 2: Wire npm scripts**

In `package.json`, add these two scripts and extend the two chains:

```json
"test:three": "tsx --test src/lib/three/quality.test.ts src/lib/three/timeline.test.ts src/lib/three/assets.test.ts src/lib/hero-timeline.test.ts",
"test:e2e:home": "playwright test e2e/home-hero.spec.ts",
```

`"test"` becomes:

```json
"test": "npm run test:dod && npm run test:materials && npm run test:turntable && npm run test:robot && npm run test:three",
```

`"test:e2e"` becomes:

```json
"test:e2e": "npm run test:e2e:dod && npm run test:e2e:materials && npm run test:e2e:turntable && npm run test:e2e:robot && npm run test:e2e:home",
```

- [ ] **Step 3: Run the new spec (build + test)**

```bash
npm run build && npm run test:e2e:home
```

Expected: 2 passed. If the FPS-meets poll times out on CI, check `data-fps` values in the failure screenshot — if the scene holds <30fps even at tier `low`, reduce hero cost (particle count 360→180, grid divisions 20→10) before touching anything else.

- [ ] **Step 4: Commit**

```bash
git add e2e/home-hero.spec.ts package.json
git commit -m "test(home): e2e hero infra evidence — tier/fps telemetry, anchors, grain, scroll survivability"
```

---

### Task 14: Full regression — unit, all e2e specs, build

**Files:** none (verification only)

- [ ] **Step 1: Unit tests**

```bash
npm test
```

Expected: all suites pass (dod, materials, turntable, robot, three).

- [ ] **Step 2: All e2e specs — the 4 existing specs must pass UNMODIFIED**

```bash
npm run test:e2e
```

Expected: 5 suites pass (dod-gate, material-spheres, product-turntable, robot-arm, home-hero). The 4 demo specs were not touched — if any fails, the hero refactor leaked somewhere; investigate before proceeding (most likely suspect: global CSS or bundle size affecting demo TTI).

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: clean build, no type/lint errors.

- [ ] **Step 4: Commit (only if anything needed fixing)**

If Steps 1-3 required changes (e.g., hero cost reduction from Task 13 Step 3), commit them:

```bash
git add -A
git commit -m "fix(home): tune W1 hero cost for CI headless fps budget"
```

---

### Task 15: Visual verification pass + tuning + README

**Files:**
- Modify: `src/components/home/HeroCanvas.tsx` (bloom/grain tuning constants only, if needed)
- Modify: `README.md` (new "共享 3D 基建（W1）" section)

- [ ] **Step 1: Golden-path visual check (desktop)**

```bash
npm run dev
```

Using a real browser at `http://localhost:3000` (1280×800 or larger), verify each checkpoint and take a screenshot:

1. **Page top (hero station):** core + rings glow subtly via Bloom (not blown out); HTML eyebrow/title/sub fully readable; grain texture faintly visible at 100% zoom.
2. **Scroll to About:** camera glides then PARKS (dwell) — during the park, only the ambient object rotation continues; core remains softly in focus (DoF), particles behind slightly defocused.
3. **Scroll to Works / Contact:** each station parks; text sections readable over the canvas (DOM vignette + backdrop blur still working).
4. **Mouse move at any station:** background parallaxes a few pixels around the focused core; the core stays pinned.

If Bloom is invisible → lower `luminanceThreshold` (0.45 → 0.35) or raise `intensity` (0.7 → 0.9) in `HeroCanvas.tsx`. If halos blow out → raise threshold toward 0.6. If grain reads as dirt → lower GrainOverlay opacity (0.35 → 0.25). Record final values in the README table.

- [ ] **Step 2: Edge checks**

1. **Mobile viewport (375×812):** scene renders; parallax effectively off (touch produces no mouse pointermove); no layout break; grain not overwhelming.
2. **Reduced motion** (DevTools rendering emulation or OS setting): canvas disabled, gradient fallback + degrade notice visible, no grain (canvasEnabled false), page still complete.
3. **WebGL unavailable** (can be faked by evaluating a script that makes `getContext('webgl')` return null before load, or trust the existing useWebGLSupport path): same fallback path as reduced motion.

- [ ] **Step 3: README section**

Append to `README.md` (Chinese, matching existing doc style) a section covering:

```markdown
## 共享 3D 基建（W1）

- `src/components/three/`：业务无关共享层
  - `LightRig`（studio/rim/tech 光照预设，可选自托管 HDR）
  - `PostFX`（DoF 自动对焦 + Bloom + SMAA，可选暗角；老设备静默降级）
  - `CameraTimeline`（滚动刷帧相机引擎：DOM data-point 锚点 → dwell 驻留 → 阻尼；鼠标绕焦点视差）
  - `QualityGuard`（rAF FPS 采样，持续 <30fps 自动降档，单向不升档）
  - `GrainOverlay`（1fps demand Canvas 胶片颗粒，multiply 混合）
  - `LoadingVeil`（单调峰值进度环；无异步资产时不渲染）
  - `useGlbScene`（注册表驱动的 GLB 加载，W2/W3 消费）
- `src/lib/three/`：纯逻辑（quality 分档 / timeline 数学 / assets 注册表），node:test 覆盖
- 分档：high（dpr≤2+全后处理）/ balanced（dpr≤1.5，DoF 关）/ low（dpr 1，无后处理）
- 首页证据：`data-testid="hero-canvas"` 的 data-tier / data-fps-source="raf" / data-fps-meets
- 验证命令：`npm run test:three`、`npm run test:e2e:home`
- W1 视觉参数（若 Task 15 调优过，记录最终值）：Bloom intensity/threshold、Grain opacity
```

- [ ] **Step 4: Commit**

```bash
git add README.md src/components/home/HeroCanvas.tsx
git commit -m "docs(readme): W1 shared 3D infra guide + hero post-tuning"
```

---

## Final Definition of Done (W1)

- [ ] `npm test` green (incl. new `test:three` suite)
- [ ] `npm run test:e2e` green — 4 existing demo specs unmodified + new home spec
- [ ] `npm run build` clean
- [ ] Visual pass completed with screenshots (Task 15 Step 1-2)
- [ ] README section landed
- [ ] All work committed on `main` (or feature branch if executed in a worktree — merge per superpowers:finishing-a-development-branch)

## Out of scope (do not do)

- W2 GLB 合同 / validate-glb.mjs / make-starter-world.mjs / home-world.glb / LoadingVeil mounting / W2 5-gate spec / home reel
- W3 demo adoption (LightRig/PostFX into the 4 demo canvases)
- Changing demo code, copy, or any e2e spec of the 4 demos
- Physics, audio, walkable-world interaction
