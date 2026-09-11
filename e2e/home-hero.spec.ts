import { test, expect } from "@playwright/test";

/**
 * Home hero — W1 shared 3D infra evidence:
 * - hero canvas mounts with tier + real rAF FPS telemetry
 * - auto-degrade keeps FPS at target (tier may land on any of high/balanced/low)
 * - timeline DOM anchors + grain overlay present
 * - scrolling across anchors keeps the canvas alive (dwell scrub survivability)
 *
 * CI proof: npm run test:e2e:home
 * Prereq: npx playwright install chromium && npm run build
 */

test.describe("home hero (W1 3D infra)", () => {
  test("hero canvas mounts with tier + rAF fps telemetry meeting target", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-fps-source", "raf");
    await expect(canvas).toHaveAttribute("data-fps-target", "30");

    const tier = await canvas.getAttribute("data-tier");
    expect(["high", "balanced", "low"]).toContain(tier);

    // Wait until measured FPS is written
    await expect
      .poll(async () => (await canvas.getAttribute("data-fps")) || "", {
        timeout: 15_000,
      })
      .not.toBe("");

    // Auto-degrade may take up to ~4.5s (3 samples × 500ms per tier × up to 2 steps)
    await expect
      .poll(async () => await canvas.getAttribute("data-fps-meets"), {
        timeout: 25_000,
      })
      .toBe("true");
  });

  test("timeline anchors + grain overlay present; dwell scrub survives scrolling", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator('[data-point="about"]')).toHaveCount(1);
    await expect(page.locator('[data-point="works"]')).toHaveCount(1);
    await expect(page.locator('[data-point="contact"]')).toHaveCount(1);

    await expect(page.getByTestId("grain-overlay")).toBeVisible({
      timeout: 15_000,
    });

    // Scroll through all stations and back — canvas must stay mounted
    await page.locator('[data-point="about"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('[data-point="works"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('[data-point="contact"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await expect(page.getByTestId("hero-canvas")).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await expect(page.getByTestId("hero-canvas")).toBeVisible();
  });
});
