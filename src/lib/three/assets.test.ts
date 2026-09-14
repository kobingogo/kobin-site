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
  it("registers all exterior LODs with meshopt budgets", () => {
    const expected = [
      ["orbital-lab-exterior-lod0", 8],
      ["orbital-lab-exterior-lod1", 4],
      ["orbital-lab-exterior-lod2", 2],
    ] as const;

    for (const [id, budgetMb] of expected) {
      const station = getAsset(id);
      assert.ok(station);
      assert.equal(station.compression, "meshopt");
      assert.equal(station.budgetBytes, budgetMb * 1024 * 1024);
    }
  });

  it("registers the complete interior asset set", () => {
    const ids = ASSETS.map((asset) => asset.id);
    assert.ok(ids.includes("docking-airlock"));
    assert.ok(ids.includes("guide-robot"));
    assert.ok(ids.includes("holographic-display"));
    for (const id of ["docking-airlock", "guide-robot", "holographic-display"]) {
      const asset = getAsset(id)!;
      assert.equal(asset.compression, "meshopt");
      assert.ok(asset.url.startsWith("/assets/interior/"));
      assert.ok(asset.budgetBytes <= 3 * 1024 * 1024);
    }
  });

  it("getAsset resolves registered ids only", () => {
    assert.equal(getAsset("missing-world"), undefined);
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
