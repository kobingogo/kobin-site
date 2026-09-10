import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

/**
 * Turntable Eval evidence:
 * - formal reel under public/demos/product-turntable/reel.webm
 * - real TTI (controls/canvas ready) < 3000ms, shown in UI
 * - desktop mouse drag + touch/pointer rotate
 *
 * CI proof: npm run test:e2e:turntable
 * Prereq: npx playwright install chromium && npm run build
 */

const REEL_PATH = path.join(
  process.cwd(),
  "public/demos/product-turntable/reel.webm",
);

async function waitInteractive(page: import("@playwright/test").Page) {
  const canvas = page.getByTestId("product-turntable-canvas");
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await expect(canvas).toHaveAttribute("data-interactive", "true", {
    timeout: 10_000,
  });
  return canvas;
}

async function readAzimuth(canvas: import("@playwright/test").Locator) {
  const raw = await canvas.getAttribute("data-azimuth");
  return Number(raw ?? "0");
}

test.describe("product-turntable eval", () => {
  test("formal reel asset exists (≤20s portfolio webm)", async () => {
    expect(fs.existsSync(REEL_PATH), "reel.webm must be committed").toBe(true);
    const st = fs.statSync(REEL_PATH);
    expect(st.size).toBeGreaterThan(50_000);
  });

  test("sample switch, proxy fallback, load failure, reel guidance + asset", async ({
    page,
  }) => {
    await page.goto("/demos/product-turntable");
    await expect(page.getByTestId("turntable-mobile-tip")).toBeVisible();
    await expect(page.getByTestId("turntable-tti")).toBeVisible();
    await expect(page.getByTestId("reel-asset-link")).toBeVisible();
    await expect(page.getByTestId("reel-asset-video")).toBeVisible();

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

    await page.getByTestId("mode-proxy").click();
    await expect(page.getByTestId("mode-proxy")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("render-mode-badge")).toContainText("代理模");

    await page.getByTestId("mode-sample").click();
    await page.getByTestId("simulate-bad-recon").click();
    await expect(page.getByTestId("render-mode-badge")).toContainText("代理模");
    await expect(page.getByTestId("turntable-failure-banner")).toBeVisible();

    await expect(page.getByTestId("reel-guidance")).toBeVisible();
    await expect(page.getByTestId("record-reel")).toBeVisible();

    await page.getByTestId("ui-failure-load").click();
    await expect(page.getByTestId("turntable-failure-banner")).toBeVisible();
    await expect(page.getByTestId("product-turntable-fallback")).toBeVisible();
    await expect(page.getByTestId("product-turntable-canvas")).toHaveCount(0);
    await expect(
      page.getByTestId("product-turntable-canvas-loading"),
    ).toHaveCount(0);
  });

  test("real TTI < 3000ms shown in UI (controls/canvas ready)", async ({
    page,
  }) => {
    await page.goto("/demos/product-turntable");
    // Ensure normal mode so canvas mounts
    await page.getByTestId("ui-failure-none").click();
    const canvas = await waitInteractive(page);

    const ttiEl = page.getByTestId("turntable-tti");
    await expect(ttiEl).toBeVisible();

    // Wait until measured TTI is written (non-empty data-tti-ms)
    await expect
      .poll(async () => (await ttiEl.getAttribute("data-tti-ms")) || "", {
        timeout: 10_000,
      })
      .not.toBe("");

    const ttiMs = Number(await ttiEl.getAttribute("data-tti-ms"));
    const budget = Number(await ttiEl.getAttribute("data-tti-budget-ms"));
    expect(Number.isFinite(ttiMs)).toBe(true);
    expect(budget).toBe(3000);
    expect(ttiMs).toBeGreaterThan(0);
    expect(ttiMs).toBeLessThan(3000);

    // UI copy must reflect the real measured value (no fake placeholders)
    await expect(ttiEl).toContainText(/ms|s/);
    await expect(ttiEl).not.toContainText("—");
    await expect(canvas).toHaveAttribute("data-interactive", "true");
  });

  test("desktop mouse drag rotates turntable (azimuth changes)", async ({
    page,
  }) => {
    await page.goto("/demos/product-turntable");
    await page.getByTestId("ui-failure-none").click();
    // Pause auto-spin so azimuth delta is from drag, not animation
    const auto = page.getByTestId("toggle-autospin");
    if ((await auto.getAttribute("aria-pressed")) === "true") {
      await auto.click();
    }

    const canvas = await waitInteractive(page);
    const box = await canvas.boundingBox();
    expect(box).toBeTruthy();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    const before = await readAzimuth(canvas);

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 140, cy, { steps: 12 });
    await page.mouse.up();

    await expect
      .poll(async () => Math.abs((await readAzimuth(canvas)) - before), {
        timeout: 5_000,
      })
      .toBeGreaterThan(0.05);
  });

  test("touch/pointer drag rotates turntable", async ({ page }) => {
    await page.goto("/demos/product-turntable");
    await page.getByTestId("ui-failure-none").click();
    const auto = page.getByTestId("toggle-autospin");
    if ((await auto.getAttribute("aria-pressed")) === "true") {
      await auto.click();
    }

    const canvas = await waitInteractive(page);
    const before = await readAzimuth(canvas);

    await canvas.evaluate((el) => {
      const target =
        (el.querySelector("canvas") as HTMLCanvasElement | null) ?? el;
      const r = target.getBoundingClientRect();
      const x0 = r.left + r.width * 0.45;
      const y0 = r.top + r.height * 0.5;
      const x1 = x0 + 120;
      const opts = {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        pointerType: "touch" as const,
        isPrimary: true,
        buttons: 1,
      };
      target.dispatchEvent(
        new PointerEvent("pointerdown", { ...opts, clientX: x0, clientY: y0 }),
      );
      target.dispatchEvent(
        new PointerEvent("pointermove", { ...opts, clientX: x1, clientY: y0 }),
      );
      target.dispatchEvent(
        new PointerEvent("pointerup", {
          ...opts,
          buttons: 0,
          clientX: x1,
          clientY: y0,
        }),
      );
    });

    await expect
      .poll(async () => Math.abs((await readAzimuth(canvas)) - before), {
        timeout: 5_000,
      })
      .toBeGreaterThan(0.05);
  });
});
