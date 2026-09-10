import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCT_SAMPLES,
  PROXY_FALLBACK_TEXTURE,
  REEL_SECONDS,
  buildReelGuidance,
  formatTti,
  getProductSample,
  resolveMeshSize,
  resolveShape,
  resolveTexturePath,
  shouldUseProxyFallback,
} from "./product-turntable";

describe("product-turntable helpers", () => {
  it("ships exactly 3 product samples with distinct textures", () => {
    assert.equal(PRODUCT_SAMPLES.length, 3);
    const ids = new Set(PRODUCT_SAMPLES.map((p) => p.id));
    assert.equal(ids.size, 3);
    const textures = new Set(PRODUCT_SAMPLES.map((p) => p.texturePath));
    assert.equal(textures.size, 3);
    for (const p of PRODUCT_SAMPLES) {
      assert.ok(p.texturePath.startsWith("/demos/product-turntable/"));
      assert.ok(p.label.length > 0);
      assert.ok(["cylinder", "box", "roundedBox"].includes(p.shape));
    }
  });

  it("getProductSample resolves known ids", () => {
    assert.equal(getProductSample("bottle")?.labelEn, "Cyan Bottle");
    assert.equal(getProductSample("missing"), undefined);
  });

  it("proxy mode forces box + fallback texture", () => {
    const sample = getProductSample("bottle")!;
    assert.equal(resolveTexturePath(sample, "sample"), sample.texturePath);
    assert.equal(resolveTexturePath(sample, "proxy"), PROXY_FALLBACK_TEXTURE);
    assert.equal(resolveShape(sample, "sample"), "cylinder");
    assert.equal(resolveShape(sample, "proxy"), "box");
    assert.deepEqual(resolveMeshSize(sample, "proxy"), [1, 1, 1]);
  });

  it("shouldUseProxyFallback triggers on recon/white-screen/load fail", () => {
    assert.equal(shouldUseProxyFallback({}), false);
    assert.equal(
      shouldUseProxyFallback({ reconLooksUnrecognizable: true }),
      true,
    );
    assert.equal(shouldUseProxyFallback({ whiteScreenRisk: true }), true);
    assert.equal(shouldUseProxyFallback({ textureLoadFailed: true }), true);
    assert.equal(shouldUseProxyFallback({ forceProxy: true }), true);
  });

  it("formatTti and reel guidance are readable", () => {
    assert.equal(formatTti(null), "—");
    assert.equal(formatTti(420), "420 ms");
    assert.equal(formatTti(1500), "1.50 s");
    assert.equal(REEL_SECONDS, 15);
    const tips = buildReelGuidance();
    assert.ok(tips.length >= 3);
    assert.ok(tips.some((t) => t.includes("15")));
  });
});
