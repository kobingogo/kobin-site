import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * Robot-arm Eval evidence:
 * - formal reel under public/demos/robot-arm/reel.webm
 * - real rAF-sampled FPS ≥ 30 shown in UI (default balanced quality)
 * - chips / scripted demo / load failure
 *
 * CI proof: npm run test:e2e:robot
 * Prereq: npx playwright install chromium && npm run build
 */

const REEL_PATH = path.join(
  process.cwd(),
  "public/demos/robot-arm/reel.webm",
);

test.describe("robot-arm eval", () => {
  test("formal reel asset exists (≤20s portfolio webm)", async () => {
    expect(fs.existsSync(REEL_PATH), "reel.webm must be committed").toBe(true);
    const st = fs.statSync(REEL_PATH);
    expect(st.size).toBeGreaterThan(50_000);
  });

  test("command chip, scripted demo, reel playable, load failure hides canvas", async ({
    page,
  }) => {
    await page.goto("/demos/robot-arm");
    await expect(page.getByTestId("robot-mobile-tip")).toBeVisible();
    await expect(page.getByTestId("robot-score")).toContainText("抓取/放置");
    await expect(page.getByTestId("reel-asset-link")).toBeVisible();
    await expect(page.getByTestId("reel-asset-video")).toBeVisible();
    await expect(page.getByTestId("reel-guidance")).toBeVisible();

    const href = await page.getByTestId("reel-asset-link").getAttribute("href");
    expect(href).toBe("/demos/robot-arm/reel.webm");
    const src = await page.getByTestId("reel-asset-video").getAttribute("src");
    expect(src).toBe("/demos/robot-arm/reel.webm");

    // Execute one of the 10 fixed Chinese commands via chip
    await page.getByTestId("robot-chip-抓取左边的方块").click();
    await expect(page.getByTestId("robot-command-success")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("robot-log")).toContainText("抓取左边的方块");

    // Unknown command → readable failure
    await page.getByTestId("robot-command-input").fill("请帮我泡杯咖啡");
    await page.getByTestId("robot-command-submit").click();
    await expect(page.getByTestId("robot-command-failure")).toBeVisible();
    await expect(page.getByTestId("robot-command-failure")).toContainText(
      "下一步",
    );

    // Scripted demo path
    await page.getByTestId("robot-scripted-demo").click();
    await expect(page.getByTestId("robot-scripted-note")).toContainText("≥7", {
      timeout: 15_000,
    });

    // uiFailure=load must hide / unmount canvas
    await page.getByTestId("ui-failure-load").click();
    await expect(page.getByTestId("robot-failure-banner")).toBeVisible();
    await expect(page.getByTestId("robot-arm-fallback")).toBeVisible();
    await expect(page.getByTestId("robot-arm-canvas")).toHaveCount(0);
    await expect(page.getByTestId("robot-arm-canvas-loading")).toHaveCount(0);
  });

  test("real rAF FPS ≥ 30 shown in UI (default balanced)", async ({ page }) => {
    await page.goto("/demos/robot-arm");
    await page.getByTestId("ui-failure-none").click();
    // Ensure default balanced quality (hard ≥30 path)
    await page.getByTestId("robot-quality-balanced").click();

    const canvas = page.getByTestId("robot-arm-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-quality", "balanced");

    const fpsEl = page.getByTestId("robot-fps");
    await expect(fpsEl).toBeVisible();
    await expect(fpsEl).toHaveAttribute("data-fps-source", "raf");
    await expect(fpsEl).toHaveAttribute("data-fps-target", "30");

    // Wait until measured FPS is written
    await expect
      .poll(async () => (await fpsEl.getAttribute("data-fps")) || "", {
        timeout: 15_000,
      })
      .not.toBe("");

    const fps = Number(await fpsEl.getAttribute("data-fps"));
    const meets = await fpsEl.getAttribute("data-fps-meets");
    expect(Number.isFinite(fps)).toBe(true);
    expect(fps).toBeGreaterThanOrEqual(30);
    expect(meets).toBe("true");
    await expect(fpsEl).toContainText(/fps/i);
    await expect(fpsEl).not.toContainText("采样中");
  });
});
