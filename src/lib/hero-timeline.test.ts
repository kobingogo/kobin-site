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

  it("keys[i+1] parks at anchors[i] (positional contract)", () => {
    assert.equal(HERO_KEYS[0].id, "hero");
    HERO_ANCHORS.forEach((a, i) => assert.equal(HERO_KEYS[i + 1].id, a));
  });
});
