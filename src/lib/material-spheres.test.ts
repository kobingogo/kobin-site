import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  averageColorFromRgba,
  CURATED_MATERIALS,
  materialsFromColors,
  rgbToHex,
  sampleDominantColors,
  type Rgb,
} from "./material-spheres";

function solidRgba(
  w: number,
  h: number,
  color: Rgb,
  alpha = 255,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    data[o] = color.r;
    data[o + 1] = color.g;
    data[o + 2] = color.b;
    data[o + 3] = alpha;
  }
  return data;
}

function twoToneRgba(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const left = x < w / 2;
      data[o] = left ? 220 : 20;
      data[o + 1] = left ? 40 : 180;
      data[o + 2] = left ? 60 : 220;
      data[o + 3] = 255;
    }
  }
  return data;
}

describe("material-spheres helpers", () => {
  it("rgbToHex formats channels", () => {
    assert.equal(rgbToHex({ r: 0, g: 255, b: 16 }), "#00ff10");
  });

  it("averageColorFromRgba averages opaque pixels", () => {
    const avg = averageColorFromRgba(
      solidRgba(4, 4, { r: 100, g: 50, b: 25 }),
      4,
      4,
      1,
    );
    assert.ok(Math.abs(avg.r - 100) < 0.01);
    assert.ok(Math.abs(avg.g - 50) < 0.01);
    assert.ok(Math.abs(avg.b - 25) < 0.01);
  });

  it("sampleDominantColors returns requested distinct-ish palette", () => {
    const colors = sampleDominantColors(twoToneRgba(32, 32), 32, 32, 4);
    assert.equal(colors.length, 4);
    // At least two should differ meaningfully (red vs cyan halves)
    const spread = Math.max(
      ...colors.flatMap((a, i) =>
        colors.slice(i + 1).map((b) => {
          const dr = a.r - b.r;
          const dg = a.g - b.g;
          const db = a.b - b.b;
          return Math.sqrt(dr * dr + dg * dg + db * db);
        }),
      ),
    );
    assert.ok(spread > 40, `expected color spread, got ${spread}`);
  });

  it("materialsFromColors yields ≥4 visibly different PBR specs", () => {
    const mats = materialsFromColors(
      [
        { r: 34, g: 211, b: 238 },
        { r: 212, g: 160, b: 23 },
        { r: 184, g: 115, b: 51 },
        { r: 244, g: 240, b: 234 },
      ],
      4,
    );
    assert.ok(mats.length >= 4);
    const metalVals = new Set(mats.map((m) => m.metalness.toFixed(2)));
    const roughVals = new Set(mats.map((m) => m.roughness.toFixed(2)));
    assert.ok(metalVals.size >= 2, "metalness should vary");
    assert.ok(roughVals.size >= 2, "roughness should vary");
    const colors = new Set(mats.map((m) => m.color.toLowerCase()));
    assert.ok(colors.size >= 3, "colors should differ across spheres");
  });

  it("curated wall has ≥4 hand-tuned materials", () => {
    assert.ok(CURATED_MATERIALS.length >= 4);
    assert.ok(CURATED_MATERIALS.every((m) => m.color.startsWith("#")));
  });
});
