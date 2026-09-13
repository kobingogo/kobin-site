import { test, expect } from "@playwright/test";

/**
 * Home hero — W1 shared 3D infra evidence:
 * - hero canvas mounts with tier + real rAF FPS telemetry
 * - low FPS triggers degradation; hardware performance needs separate measurement
 * - the scene owns a single viewport with no document scroll
 * - in-scene HUD navigation changes the active camera/content state
 *
 * CI proof: npm run test:e2e:home
 * Prereq: npx playwright install chromium && npm run build
 */

test.describe("home hero (W1 3D infra)", () => {
  // FPS evidence must not compete with a second WebGL canvas in the same browser process.
  test.describe.configure({ mode: "serial" });

  test("hero canvas mounts with live rAF telemetry and adaptive quality", async ({
    page,
  }) => {
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-fps-source", "raf");
    await expect(canvas).toHaveAttribute("data-fps-target", "30");
    await expect(canvas).toHaveAttribute("data-scene-ready", "true", {
      timeout: 15_000,
    });

    const tier = await canvas.getAttribute("data-tier");
    expect(["high", "balanced", "low"]).toContain(tier);

    // Wait until measured FPS is written
    await expect
      .poll(async () => (await canvas.getAttribute("data-fps")) || "", {
        timeout: 15_000,
      })
      .not.toBe("");

    // Headless Chromium can throttle rAF below 30 even at minimum scene cost.
    // Verify that real telemetry remains live and low readings trigger the floor tier.
    await expect
      .poll(async () => Number(await canvas.getAttribute("data-fps")), {
        timeout: 25_000,
      })
      .toBeGreaterThan(0);
    const measuredFps = Number(await canvas.getAttribute("data-fps"));
    if (measuredFps < 30) {
      await expect(canvas).toHaveAttribute("data-tier", "low", { timeout: 8_000 });
    }
  });

  test("single-viewport scene + HUD navigation replace page scrolling", async ({
    page,
  }) => {
    await page.goto("/");

    const home = page.getByTestId("space-home");
    const canvas = page.getByTestId("hero-canvas");
    await expect(home).toBeVisible();
    await expect(page.getByTestId("scene-nav")).toBeVisible({ timeout: 15_000 });

    const panel = page.getByTestId("scene-panel");
    await expect(panel).toBeVisible();
    await expect
      .poll(() => panel.evaluate((element) => getComputedStyle(element).backdropFilter))
      .toBe("none");
    await expect
      .poll(() => panel.evaluate((element) => getComputedStyle(element).backgroundImage))
      .not.toContain("rgba");
    await expect
      .poll(() => panel.evaluate((element) => getComputedStyle(element).backgroundImage))
      .not.toContain("rgba");
    await expect(
      canvas.locator("xpath=./*[self::*[@data-testid='scene-interface']]"),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight);

    await page.getByTestId("scene-nav").getByRole("button", { name: /ABOUT/ }).click();
    await expect(canvas).toHaveAttribute("data-scene-view", "about");
    await page.getByTestId("scene-nav").getByRole("button", { name: /WORKS/ }).click();
    await expect(canvas).toHaveAttribute("data-scene-view", "works");
    await expect(panel.getByRole("button", { name: /Agent 假完成/ })).toBeVisible();
  });

  test("orbital cursor changes state for navigation and drag", async ({ page }) => {
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    const cursor = page.getByTestId("space-cursor");
    await expect(page.getByTestId("scene-nav")).toBeVisible();
    await page.mouse.move(1, 1);
    await page.mouse.move(700, 420, { steps: 2 });
    await expect(cursor).toHaveAttribute("data-visible", "true");
    await expect(cursor).toHaveAttribute("data-mode", "orbit");

    await page.getByRole("button", { name: /探索作品轨道/ }).hover();
    await expect(cursor).toHaveAttribute("data-mode", "lock");
    await expect(cursor).toContainText("ENTER");

    await page.mouse.down();
    await expect(cursor).toHaveAttribute("data-mode", "drag");
    await expect(cursor).toHaveAttribute("data-pressed", "true");
    await page.mouse.up();
    await expect(cursor).toHaveAttribute("data-mode", "lock");

    await expect(canvas).toHaveAttribute("data-scene-view", "works");
    const firstProject = page.getByRole("button", { name: /NODE 01/ });
    await firstProject.hover();
    await expect(canvas).toHaveAttribute("data-project-focus", "0");
    await expect(cursor).toContainText("OPEN");
  });

  test("camera alignment triggers the orbital eclipse signature event", async ({ page }) => {
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    await expect(canvas).toHaveAttribute("data-scene-ready", "true", { timeout: 15_000 });
    await page.mouse.move(900, 540);
    await page.mouse.down();
    await page.mouse.move(700, 540, { steps: 4 });
    await page.mouse.up();

    await expect(canvas).toHaveAttribute("data-eclipse-state", "active", { timeout: 3_000 });
    await expect(page.getByText(/ORBITAL ECLIPSE/)).toBeVisible();
  });
});
