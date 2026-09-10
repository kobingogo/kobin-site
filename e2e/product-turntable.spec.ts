import { test, expect } from "@playwright/test";

/**
 * Smoke: 3 samples + proxy fallback + load failure hides canvas + reel guidance.
 * Run: npx playwright install chromium && npm run build && npm run test:e2e:turntable
 */
test.describe("product-turntable smoke", () => {
  test("sample switch, proxy fallback, load failure hides canvas, reel guidance", async ({
    page,
  }) => {
    await page.goto("/demos/product-turntable");
    await expect(page.getByTestId("turntable-mobile-tip")).toBeVisible();
    await expect(page.getByTestId("turntable-tti")).toBeVisible();

    // 3 product samples
    await page.getByTestId("sample-speaker").click();
    await expect(page.getByTestId("sample-speaker")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("sample-mug").click();
    await expect(page.getByTestId("sample-mug")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Proxy fallback
    await page.getByTestId("mode-proxy").click();
    await expect(page.getByTestId("mode-proxy")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("render-mode-badge")).toContainText("代理模");

    // Bad recon simulation lands on proxy
    await page.getByTestId("mode-sample").click();
    await page.getByTestId("simulate-bad-recon").click();
    await expect(page.getByTestId("render-mode-badge")).toContainText("代理模");
    await expect(page.getByTestId("turntable-failure-banner")).toBeVisible();

    // Reel guidance present; record button visible
    await expect(page.getByTestId("reel-guidance")).toBeVisible();
    await expect(page.getByTestId("record-reel")).toBeVisible();

    // uiFailure=load must hide / unmount canvas
    await page.getByTestId("ui-failure-load").click();
    await expect(page.getByTestId("turntable-failure-banner")).toBeVisible();
    await expect(page.getByTestId("product-turntable-fallback")).toBeVisible();
    await expect(page.getByTestId("product-turntable-canvas")).toHaveCount(0);
    await expect(
      page.getByTestId("product-turntable-canvas-loading"),
    ).toHaveCount(0);
  });
});
