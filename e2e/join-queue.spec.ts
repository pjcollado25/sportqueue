import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("staff can start a session on a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone layout only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pickleball today" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Continue to players" }).click();
  await page.getByPlaceholder("Add a player").fill("Playwright Player");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByText("Playwright Player", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Review & start" }).click();
  await page.getByRole("button", { name: /Start session/ }).click();
  await expect(page.getByText("Session is live")).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("desktop shows the side menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop layout only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Pickleball today" })).toBeVisible();
});

async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}
