import { test, expect } from "@playwright/test";
import { loginWithPin } from "./helpers.ts";

test.describe("offline mode", () => {
  test("app loads and shows home screen when offline", async ({ page, context }) => {
    // First visit while online to populate service worker cache
    await page.goto("/");
    await loginWithPin(page);
    await expect(page.getByText("Sow What")).toBeVisible();

    // Visit a few routes to trigger their assets to be precached
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText("Sow What")).toBeVisible();

    // Give SW time to finish precaching in the background
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Reload — should serve from SW cache
    await page.reload();
    await expect(page.getByText("Sow What")).toBeVisible({ timeout: 10000 });
  });

  test("seed inventory page loads offline after initial cache", async ({ page, context }) => {
    // Online first visit
    await page.goto("/");
    await loginWithPin(page);
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();

    // Wait for SW to cache
    await page.waitForTimeout(3000);

    // Go offline
    await context.setOffline(true);

    // Reload the seeds page
    await page.reload();
    await expect(page.getByText("Seed Inventory")).toBeVisible({ timeout: 10000 });
  });

  test("data persists in IndexedDB while offline", async ({ page, context }) => {
    // Online: load app and check seed count
    await page.goto("/");
    await loginWithPin(page);
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();

    // Get current seed count from the page
    const seedCountText = await page.locator("text=/\\d+ seeds?/").first().textContent();
    expect(seedCountText).toBeTruthy();

    // Wait for SW to cache
    await page.waitForTimeout(3000);

    // Go offline and reload
    await context.setOffline(true);
    await page.reload();

    // Seeds should still be visible (from IndexedDB)
    await expect(page.getByText("Seed Inventory")).toBeVisible({ timeout: 10000 });
    // Seed count should be the same (data persisted)
    const offlineCountText = await page.locator("text=/\\d+ seeds?/").first().textContent();
    expect(offlineCountText).toBe(seedCountText);
  });
});
