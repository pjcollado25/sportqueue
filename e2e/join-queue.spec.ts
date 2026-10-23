import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
  });
});

test("a player can join from a phone", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "phone", "phone layout only");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeHidden();
  await expectNoHorizontalScroll(page);

  await page.getByRole("link", { name: "Join queue" }).click();
  await page.getByRole("button", { name: "Tennis", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Singles/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your name").fill("Playwright Player");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Join queue" }).click();

  await expect(page.getByText("You're in the queue")).toBeVisible();
  await expect(page.getByRole("heading", { name: "You're next" })).toBeVisible();
  await page.getByRole("link", { name: "See the live queue" }).click();
  await expect(page.getByText("Playwright Player")).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test("desktop shows the side menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop layout only");
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Sections" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Welcome" })).toBeVisible();
});

async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client + 1);
}
