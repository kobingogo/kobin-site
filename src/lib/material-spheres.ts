/**
 * Material spheres — pure helpers for color sampling + PBR variant generation.
 * No paid APIs. Image→PBR is local Canvas sampling + procedural variants.
 * TODO (paid): image / material generation API — do not wire keys here.
 */

export type Rgb = { r: number; g: number; b: number };

export type SphereMaterialSpec = {
  id: string;
  label: string;
  color: string;
  metalness: number;
  roughness: number;
  emissive?: string;
  emissiveIntensity?: number;
  /** optional env map intensity hint for UI */
  envHint?: number;
};

export type LightPresetId = "studio" | "rim" | "warm";

export type LightPreset = {
  id: LightPresetId;
  label: string;
  key: { position: [number, number, number]; intensity: number; color: string };
  fill: { position: [number, number, number]; intensity: number; color: string };
  rim: { position: [number, number, number]; intensity: number; color: string };
  ambient: number;
  envIntensity: number;
};

export const SAMPLE_REF_PATH = "/demos/material-spheres/sample-ref.png";

export const LIGHT_PRESETS: LightPreset[] = [
  {
    id: "studio",
    label: "Studio",
    key: { position: [3.2, 4.2, 2.8], intensity: 1.35, color: "#ffffff" },
    fill: { position: [-3.5, 1.2, 1.5], intensity: 0.45, color: "#a5f3fc" },
    rim: { position: [0.2, 1.5, -3.8], intensity: 0.55, color: "#e0e7ff" },
    ambient: 0.22,
    envIntensity: 0.85,
  },
  {
    id: "rim",
    label: "Rim",
    key: { position: [1.5, 2.2, 4], intensity: 0.55, color: "#e2e8f0" },
    fill: { position: [-2, 0.8, 2], intensity: 0.25, color: "#67e8f9" },
    rim: { position: [-0.5, 2.8, -3.2], intensity: 1.8, color: "#22d3ee" },
    ambient: 0.12,
    envIntensity: 0.55,
  },
  {
    id: "warm",
    label: "Warm",
    key: { position: [2.8, 3.5, 2.2], intensity: 1.5, color: "#ffd7a8" },
    fill: { position: [-3, 1.5, 0.8], intensity: 0.4, color: "#fda4af" },
    rim: { position: [0.5, 1.2, -3.5], intensity: 0.7, color: "#fdba74" },
    ambient: 0.28,
    envIntensity: 0.7,
  },
];

/** Curated hand-tuned static wall — acceptance fallback when image→PBR is weak / fails. */
export const CURATED_MATERIALS: SphereMaterialSpec[] = [
  {
    id: "curated-chrome",
    label: "Chrome",
    color: "#c8d0dc",
    metalness: 1,
    roughness: 0.08,
    envHint: 1.2,
  },
  {
    id: "curated-brushed",
    label: "Brushed Al",
    color: "#9aa3b2",
    metalness: 0.92,
    roughness: 0.38,
  },
  {
    id: "curated-gold",
    label: "Gold",
    color: "#d4a017",
    metalness: 1,
    roughness: 0.22,
  },
  {
    id: "curated-copper",
    label: "Copper",
    color: "#b87333",
    metalness: 0.95,
    roughness: 0.28,
  },
  {
    id: "curated-ceramic",
    label: "Ceramic",
    color: "#f4f0ea",
    metalness: 0.02,
    roughness: 0.55,
  },
  {
    id: "curated-rubber",
    label: "Rubber",
    color: "#1f2937",
    metalness: 0,
    roughness: 0.92,
  },
  {
    id: "curated-plastic",
    label: "Cyan Plastic",
    color: "#22d3ee",
    metalness: 0.05,
    roughness: 0.35,
  },
  {
    id: "curated-emissive",
    label: "Glow Glass",
    color: "#0e7490",
    metalness: 0.15,
    roughness: 0.12,
    emissive: "#22d3ee",
    emissiveIntensity: 0.45,
  },
];

export function rgbToHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function luminance({ r, g, b }: Rgb): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

export function saturateRgb(c: Rgb, amount: number): Rgb {
  const gray = luminance(c) * 255;
  return {
    r: gray + (c.r - gray) * amount,
    g: gray + (c.g - gray) * amount,
    b: gray + (c.b - gray) * amount,
  };
}

/** Average RGB from RGBA ImageData-like buffer (stride 4). */
export function averageColorFromRgba(
  data: ArrayLike<number>,
  width: number,
  height: number,
  step = 4,
): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const stride = Math.max(1, Math.floor(step));
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] ?? 255;
      if (a < 8) continue;
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
      n += 1;
    }
  }
  if (n === 0) return { r: 128, g: 128, b: 128 };
  return { r: r / n, g: g / n, b: b / n };
}

/**
 * Simple region sampling: split image into grid cells, return cell averages
 * sorted by saturation*luma contrast so materials look distinct.
 */
export function sampleDominantColors(
  data: ArrayLike<number>,
  width: number,
  height: number,
  count = 6,
): Rgb[] {
  const cols = Math.max(2, Math.ceil(Math.sqrt(count * 1.5)));
  const rows = Math.max(2, Math.ceil(count / cols) + 1);
  const cellW = Math.max(1, Math.floor(width / cols));
  const cellH = Math.max(1, Math.floor(height / rows));
  const cells: { rgb: Rgb; score: number }[] = [];

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      const x0 = cx * cellW;
      const y0 = cy * cellH;
      const x1 = Math.min(width, x0 + cellW);
      const y1 = Math.min(height, y0 + cellH);
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          const i = (y * width + x) * 4;
          if ((data[i + 3] ?? 255) < 8) continue;
          r += data[i] ?? 0;
          g += data[i + 1] ?? 0;
          b += data[i + 2] ?? 0;
          n += 1;
        }
      }
      if (n === 0) continue;
      const rgb = { r: r / n, g: g / n, b: b / n };
      const lum = luminance(rgb);
      const max = Math.max(rgb.r, rgb.g, rgb.b);
      const min = Math.min(rgb.r, rgb.g, rgb.b);
      const sat = max === 0 ? 0 : (max - min) / max;
      // Prefer colorful midtones; still keep dark/light accents
      const score = sat * 1.4 + (1 - Math.abs(lum - 0.45)) * 0.6;
      cells.push({ rgb, score });
    }
  }

  cells.sort((a, b) => b.score - a.score);

  const picked: Rgb[] = [];
  for (const cell of cells) {
    if (picked.length >= count) break;
    const tooClose = picked.some((p) => colorDistance(p, cell.rgb) < 28);
    if (!tooClose) picked.push(cell.rgb);
  }

  // Pad with mixes if image is flat
  const base =
    picked[0] ?? averageColorFromRgba(data, width, height) ?? {
      r: 80,
      g: 160,
      b: 180,
    };
  while (picked.length < count) {
    const t = picked.length / count;
    picked.push(
      saturateRgb(
        mixRgb(base, { r: 255 * (1 - t), g: 180 * t, b: 220 }, 0.35 + t * 0.4),
        1.2,
      ),
    );
  }
  return picked.slice(0, count);
}

export function colorDistance(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

type VariantKind =
  | "metal-polished"
  | "metal-brushed"
  | "dielectric-matte"
  | "dielectric-gloss"
  | "rubber"
  | "emissive-tint";

const VARIANT_DEFS: {
  kind: VariantKind;
  label: string;
  metalness: number;
  roughness: number;
  satBoost: number;
  emissive?: boolean;
}[] = [
  {
    kind: "metal-polished",
    label: "Polished Metal",
    metalness: 1,
    roughness: 0.1,
    satBoost: 0.85,
  },
  {
    kind: "metal-brushed",
    label: "Brushed Metal",
    metalness: 0.88,
    roughness: 0.42,
    satBoost: 0.7,
  },
  {
    kind: "dielectric-gloss",
    label: "Gloss Coat",
    metalness: 0.08,
    roughness: 0.18,
    satBoost: 1.15,
  },
  {
    kind: "dielectric-matte",
    label: "Matte Soft",
    metalness: 0.02,
    roughness: 0.72,
    satBoost: 0.95,
  },
  {
    kind: "rubber",
    label: "Rubber Soft",
    metalness: 0,
    roughness: 0.95,
    satBoost: 0.55,
  },
  {
    kind: "emissive-tint",
    label: "Emissive Tint",
    metalness: 0.2,
    roughness: 0.25,
    satBoost: 1.25,
    emissive: true,
  },
];

/**
 * Build ≥4 visibly different MeshStandardMaterial specs from sampled colors.
 * Seeded by image colors; procedural metalness/roughness variants.
 */
export function materialsFromColors(
  colors: Rgb[],
  minCount = 4,
): SphereMaterialSpec[] {
  const palette =
    colors.length > 0
      ? colors
      : [
          { r: 34, g: 211, b: 238 },
          { r: 212, g: 160, b: 23 },
          { r: 148, g: 163, b: 184 },
          { r: 244, g: 240, b: 234 },
        ];

  const out: SphereMaterialSpec[] = [];
  const n = Math.max(minCount, Math.min(VARIANT_DEFS.length, palette.length + 2));

  for (let i = 0; i < n; i++) {
    const def = VARIANT_DEFS[i % VARIANT_DEFS.length];
    const base = palette[i % palette.length];
    const tinted = saturateRgb(base, def.satBoost);
    // Slight per-variant luminance shift so neighbors differ even if palette is short
    const shift = (i % 3) * 12 - 12;
    const color = rgbToHex({
      r: tinted.r + shift,
      g: tinted.g + shift * 0.6,
      b: tinted.b - shift * 0.4,
    });
    const spec: SphereMaterialSpec = {
      id: `proc-${def.kind}-${i}`,
      label: def.label,
      color,
      metalness: def.metalness,
      roughness: Math.min(
        1,
        Math.max(0, def.roughness + ((i % 2) * 0.06 - 0.03)),
      ),
    };
    if (def.emissive) {
      spec.emissive = color;
      spec.emissiveIntensity = 0.35 + (luminance(base) > 0.5 ? 0.1 : 0.25);
    }
    out.push(spec);
  }
  return out;
}

export function getLightPreset(id: LightPresetId): LightPreset {
  return LIGHT_PRESETS.find((p) => p.id === id) ?? LIGHT_PRESETS[0];
}

/** Public homepage-ready still (Canvas-2D composed; no WebGL required). */
export const HOMEPAGE_READY_PATH = "/demos/material-spheres/homepage-ready.png";

/** Committed curated texture pack (JSON + PNG swatches). */
export const TEXTURE_PACK_PATH = "/demos/material-spheres/texture-pack/";

export type TexturePackMaterial = SphereMaterialSpec & {
  colorMap: string;
};

export type TexturePackManifest = {
  name: string;
  version: number;
  source: string;
  lightPresetId?: LightPresetId;
  note: string;
  materials: TexturePackMaterial[];
};

/** Build a downloadable / commit-ready texture-pack manifest from sphere specs. */
export function buildTexturePackManifest(
  materials: SphereMaterialSpec[],
  opts?: { source?: string; lightPresetId?: LightPresetId },
): TexturePackManifest {
  return {
    name: "material-spheres-texture-pack",
    version: 1,
    source: opts?.source ?? "live-demo",
    lightPresetId: opts?.lightPresetId,
    note: "Local export — no paid API. Solid color-map swatches + PBR params.",
    materials: materials.map((m) => ({
      ...m,
      colorMap: `swatches/${m.id}.png`,
    })),
  };
}
