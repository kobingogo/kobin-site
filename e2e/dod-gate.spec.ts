import { test, expect } from "@playwright/test";

/**
 * Smoke: gated mark-complete blocked + export JSON control present.
 * Run: npx playwright install chromium && npm run build && npm run test:e2e:dod
 */
test.describe("agent-dod-gate smoke", () => {
  test("gated fake-complete blocks mark-complete; export JSON visible", async ({
    page,
  }) => {
    await page.goto("/demos/agent-dod-gate");
    await expect(page.getByTestId("mobile-net-tip")).toBeVisible();

    await page.getByTestId("gate-on").click();
    await expect(page.getByTestId("gate-on")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("gateOn").locator("..")).toContainText("true");

    await page
      .getByTestId("preset-select")
      .selectOption({ value: "case-partial-complete" });
    await expect(
      page.getByText("部分项标绿、部分未完成", { exact: false }),
    ).toBeVisible();
    // partial: not all items marked — objective fail + gated block
    await expect(page.getByText("可点完成 否")).toBeVisible();

    await page.getByTestId("mark-complete").click();
    const status = page.getByTestId("complete-status");
    await expect(status).toBeVisible();
    await expect(status).toContainText("拦截");
    await expect(status).toContainText("partial-complete");

    await expect(page.getByTestId("export-json")).toBeVisible();
    await page.getByTestId("export-json").click();
    await expect(page.getByTestId("export-json")).toBeEnabled();

    await page.getByTestId("ui-failure-timeout").click();
    await expect(page.getByTestId("ui-failure-banner")).toContainText("超时");
  });
});
