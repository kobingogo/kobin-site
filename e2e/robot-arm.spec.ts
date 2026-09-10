import { test, expect } from "@playwright/test";

/**
 * Smoke: chips, scripted demo note, load failure hides canvas.
 * Run: npx playwright install chromium && npm run build && npm run test:e2e:robot
 */
test.describe("robot-arm smoke", () => {
  test("command chip, scripted demo, load failure hides canvas", async ({
    page,
  }) => {
    await page.goto("/demos/robot-arm");
    await expect(page.getByTestId("robot-mobile-tip")).toBeVisible();
    await expect(page.getByTestId("robot-score")).toContainText("抓取/放置");

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
    await expect(page.getByTestId("robot-scripted-note")).toContainText(
      "≥7",
      { timeout: 15_000 },
    );

    // uiFailure=load must hide / unmount canvas
    await page.getByTestId("ui-failure-load").click();
    await expect(page.getByTestId("robot-failure-banner")).toBeVisible();
    await expect(page.getByTestId("robot-arm-fallback")).toBeVisible();
    await expect(page.getByTestId("robot-arm-canvas")).toHaveCount(0);
    await expect(page.getByTestId("robot-arm-canvas-loading")).toHaveCount(0);
  });
});
