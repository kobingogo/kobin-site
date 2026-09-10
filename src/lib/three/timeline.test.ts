import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dwellRemap,
  sampleKeys,
  stationIndex,
  type TimelineKey,
  type TimelineSample,
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
  const out: TimelineSample = { pos: [0, 0, 0], look: [0, 0, 0], focus: [0, 0, 0] };

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
    // 0.1 + (0.2 - 0.1) * 0.5 is 0.15000000000000002 in IEEE-754 → compare with tolerance
    assert.equal(out.focus[0], 0);
    assert.ok(
      Math.abs(out.focus[1] - 0.15) < 1e-12,
      `focus.y = ${out.focus[1]} should be ~0.15`,
    );
    assert.equal(out.focus[2], 0);
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
