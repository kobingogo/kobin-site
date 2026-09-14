import { test, expect } from "@playwright/test";

/**
 * Home hero — W1 shared 3D infra evidence:
 * - hero canvas mounts with tier + real rAF FPS telemetry
 * - low FPS triggers degradation; hardware performance needs separate measurement
 * - the scene owns a single viewport with no document scroll
 * - the complete exterior → airlock → Xiao K → station → comms flow works
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

  test("single-viewport scene + destination navigation enters the selected station", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
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
    await expect(
      canvas.locator("xpath=./*[self::*[@data-testid='scene-interface']]"),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      innerHeight: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.innerHeight);

    await page.getByTestId("scene-nav").getByRole("button", { name: /WORKS/ }).click();
    await expect(canvas).toHaveAttribute("data-tour-mode", "direct");
    await expect(canvas).toHaveAttribute("data-current-station", "agent-dod-gate", { timeout: 10_000 });
    await expect(canvas).toHaveAttribute("data-journey-phase", "station");
    await expect(page.getByTestId("station-detail")).toContainText("Agent 假完成 DoD 闸门");

    await page.getByTestId("return-exterior").click();
    await page.getByTestId("scene-nav").getByRole("button", { name: /ABOUT/ }).click();
    await expect(canvas).toHaveAttribute("data-current-station", "about", { timeout: 10_000 });
    await expect(page.getByTestId("station-detail")).toContainText("关于 Kobin");

    await page.getByTestId("return-exterior").click();
    await page.getByTestId("scene-nav").getByRole("button", { name: /CONTACT/ }).click();
    await expect(canvas).toHaveAttribute("data-current-station", "contact", { timeout: 10_000 });
    await expect(canvas).toHaveAttribute("data-journey-phase", "comms");
    await expect(page.getByTestId("comms-station")).toBeVisible();
  });

  test("main flow reaches Xiao K, supports map navigation and ends at communications", async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    await canvas.evaluate((element) => {
      const recordPhase = () => {
        const phase = element.getAttribute("data-journey-phase");
        if (!phase) return;
        const history = element.getAttribute("data-phase-history") ?? "";
        if (!history.split(",").includes(phase)) {
          element.setAttribute("data-phase-history", history ? `${history},${phase}` : phase);
        }
      };
      recordPhase();
      new MutationObserver(recordPhase).observe(element, {
        attributes: true,
        attributeFilter: ["data-journey-phase"],
      });
    });
    await page.getByTestId("enter-lab").click();
    await expect(page.getByTestId("airlock-transition")).toBeVisible({ timeout: 5_000 });
    await expect(canvas).toHaveAttribute("data-phase-history", /exterior,approach,airlock/);
    await expect(page.getByTestId("guide-welcome")).toBeVisible({ timeout: 10_000 });

    await page.getByTestId("tour-free").click();
    await expect(page.getByTestId("lab-map")).toBeVisible();
    await page.getByTestId("map-station-robot-arm").click();
    await expect(canvas).toHaveAttribute("data-current-station", "robot-arm");
    await expect(page.getByTestId("station-detail")).toContainText("自然语言机械臂仿真");

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("lab-map")).toBeVisible();
    await page.getByTestId("map-station-robot-arm").click();
    await page.getByTestId("next-station").click();
    await expect(canvas).toHaveAttribute("data-journey-phase", "comms");
    await expect(page.getByTestId("comms-station")).toBeVisible();
    await expect(page.getByTestId("contact-kobin")).toHaveAttribute("href", "https://x.com/KobinFlow");

    await page.getByTestId("return-exterior").click();
    await expect(canvas).toHaveAttribute("data-journey-phase", "exterior");
    await expect(page.getByTestId("scene-nav")).toBeVisible();
  });

  test("Xiao K supports guided and direct entry choices", async ({ page }) => {
    test.slow();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const canvas = page.getByTestId("hero-canvas");
    await page.getByTestId("enter-lab").click();
    await expect(page.getByTestId("guide-welcome")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("tour-guided").click();
    await expect(canvas).toHaveAttribute("data-tour-mode", "guided");
    await expect(canvas).toHaveAttribute("data-current-station", "about");

    await page.getByTestId("return-exterior").click();
    await page.getByTestId("enter-lab").click();
    await expect(page.getByTestId("guide-welcome")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("tour-direct").click();
    await expect(canvas).toHaveAttribute("data-tour-mode", "direct");
    await expect(canvas).toHaveAttribute("data-current-station", "agent-dod-gate");
  });

  test("orbital cursor changes state for entry and drag", async ({ page }) => {
    await page.goto("/");

    const canvas = page.getByTestId("hero-canvas");
    const cursor = page.getByTestId("space-cursor");
    await expect(page.getByTestId("scene-nav")).toBeVisible();
    await page.mouse.move(1, 1);
    await page.mouse.move(700, 420, { steps: 2 });
    await expect(cursor).toHaveAttribute("data-visible", "true");
    await expect(cursor).toHaveAttribute("data-mode", "orbit");

    await page.getByRole("button", { name: /进入轨道实验室/ }).hover();
    await expect(cursor).toHaveAttribute("data-mode", "lock");
    await expect(cursor).toContainText("ENTER");

    await page.mouse.down();
    await expect(cursor).toHaveAttribute("data-mode", "drag");
    await expect(cursor).toHaveAttribute("data-pressed", "true");
    await page.mouse.up();
    await expect(cursor).toHaveAttribute("data-mode", "lock");

    await expect(canvas).toHaveAttribute("data-journey-phase", "approach");
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

  test("mobile interior keeps every primary control inside the viewport", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByTestId("enter-lab").click();
    await expect(page.getByTestId("guide-welcome")).toBeVisible({ timeout: 30_000 });
    await page.getByTestId("tour-free").click();
    await expect(page.getByTestId("lab-map")).toBeVisible();

    const bounds = await page.evaluate(() => {
      const elements = [
        document.querySelector('[data-testid="lab-map"]'),
        document.querySelector('[data-testid="return-exterior"]'),
      ].filter((element): element is Element => Boolean(element));
      return {
        viewportWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        rects: elements.map((element) => element.getBoundingClientRect().toJSON()),
      };
    });
    expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.viewportWidth);
    for (const rect of bounds.rects) {
      expect(rect.left).toBeGreaterThanOrEqual(0);
      expect(rect.right).toBeLessThanOrEqual(bounds.viewportWidth);
    }
    await expect(page.getByTestId("map-station-contact")).toBeVisible();
  });

  test("WebGL failure uses the readable project-safe mode", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
        if (type === "webgl2") return null;
        return original.call(this, type, ...args);
      } as typeof original;
    });
    await page.goto("/");
    await expect(page.getByText("当前设备无法启动 3D 场景")).toBeVisible();
    await expect(page.getByRole("link", { name: "Agent 假完成 DoD 闸门" })).toBeVisible();
  });
});
