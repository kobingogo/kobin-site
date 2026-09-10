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
