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
