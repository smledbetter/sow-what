import { test, expect } from "@playwright/test";
import { loginWithPin } from "./helpers.ts";

test.describe("smoke tests", () => {
  test("app loads and redirects to PIN, then shows home after login", async ({ page }) => {
    await page.goto("/");
    // Should redirect to PIN screen
    await expect(page.getByRole("heading", { name: "Enter PIN" })).toBeVisible();
    await loginWithPin(page);
    await expect(page.getByText("Sow What")).toBeVisible();
  });

  test("navigates to /seeds after PIN", async ({ page }) => {
    await page.goto("/");
    await loginWithPin(page);
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();
  });

  test("navigates to /planted after PIN", async ({ page }) => {
    await page.goto("/");
    await loginWithPin(page);
    await page.goto("/planted");
    await expect(page.getByRole("heading", { name: "Planted" })).toBeVisible();
  });

  test("navigates to /weather after PIN", async ({ page }) => {
    await page.goto("/");
    await loginWithPin(page);
    await page.goto("/weather");
    await expect(page.getByRole("heading", { name: "Weather" })).toBeVisible();
  });

  test("navigates to /settings after PIN", async ({ page }) => {
    await page.goto("/");
    await loginWithPin(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("navigates to /pin directly", async ({ page }) => {
    await page.goto("/pin");
    await expect(page.getByRole("heading", { name: "Enter PIN" })).toBeVisible();
  });
});
