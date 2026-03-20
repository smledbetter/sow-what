import { test, expect } from "@playwright/test";

test.describe("smoke tests", () => {
  test("app loads and shows home page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Sow What")).toBeVisible();
  });

  test("navigates to /seeds", async ({ page }) => {
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();
  });

  test("navigates to /planted", async ({ page }) => {
    await page.goto("/planted");
    await expect(page.getByRole("heading", { name: "Planted" })).toBeVisible();
  });

  test("navigates to /weather", async ({ page }) => {
    await page.goto("/weather");
    await expect(page.getByRole("heading", { name: "Weather" })).toBeVisible();
  });

  test("navigates to /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("Settings")).toBeVisible();
  });

  test("navigates to /pin", async ({ page }) => {
    await page.goto("/pin");
    await expect(page.getByText("Enter PIN")).toBeVisible();
  });
});
