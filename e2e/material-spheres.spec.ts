import { test, expect } from "@playwright/test";

/**
 * Smoke: light switch + curated toggle + load failure hides canvas.
 * Run: npx playwright install chromium && npm run build && npm run test:e2e:materials
 */
test.describe("material-spheres smoke", () => {
  test("light switch, curated toggle, load failure hides canvas", async ({
    page,
  }) => {
    await page.goto("/demos/material-spheres");
    await expect(page.getByTestId("material-mobile-tip")).toBeVisible();

    // Light control switch
    await page.getByTestId("light-rim").click();
    await expect(page.getByTestId("light-rim")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("light-warm").click();
    await expect(page.getByTestId("light-warm")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    // Curated toggle
    await page.getByTestId("mode-curated").click();
    await expect(page.getByTestId("mode-curated")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("material-sphere-labels")).toContainText(
      "Chrome",
    );

    // Export + formal assets links present
    await expect(page.getByTestId("export-texture-pack")).toBeVisible();
    await expect(page.getByTestId("homepage-ready-link")).toBeVisible();

    // uiFailure=load must hide / unmount canvas
    await page.getByTestId("ui-failure-load").click();
    await expect(page.getByTestId("material-failure-banner")).toBeVisible();
    await expect(page.getByTestId("material-spheres-fallback")).toBeVisible();
    await expect(page.getByTestId("material-spheres-canvas")).toHaveCount(0);
    await expect(
      page.getByTestId("material-spheres-canvas-loading"),
    ).toHaveCount(0);
  });
});
