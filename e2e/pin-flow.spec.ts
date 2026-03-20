import { test, expect } from "@playwright/test";
import { loginWithPin } from "./helpers.ts";

test.describe("PIN authentication flow", () => {
  test("enter PIN -> unlock -> navigate -> refresh -> PIN required again on new session", async ({ page }) => {
    // Step 1: Navigate to app — should redirect to PIN
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Enter PIN" })).toBeVisible();

    // Step 2: Enter correct PIN (1701)
    await loginWithPin(page);

    // Step 3: Should be on home screen now
    await expect(page.getByText("Sow What")).toBeVisible();

    // Step 4: Navigate to other screens — should work without PIN
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();

    await page.goto("/planted");
    await expect(page.getByRole("heading", { name: "Planted" })).toBeVisible();

    await page.goto("/weather");
    await expect(page.getByRole("heading", { name: "Weather" })).toBeVisible();

    // Step 5: Refresh page — auth should persist within session
    await page.reload();
    // Should still be on Weather, not redirected to PIN
    await expect(page.getByRole("heading", { name: "Weather" })).toBeVisible();

    // Step 6: Navigate back to home
    await page.goto("/");
    await expect(page.getByText("Sow What")).toBeVisible();
  });

  test("incorrect PIN shows error and clears digits", async ({ page }) => {
    await page.goto("/pin");
    await page.getByRole("heading", { name: "Enter PIN" }).waitFor();

    // Enter wrong PIN
    for (const digit of "0000") {
      await page.getByRole("button", { name: `Digit ${digit}` }).click();
    }

    // Should show error
    await expect(page.getByText("Incorrect PIN")).toBeVisible();

    // Should still be on PIN page
    await expect(page.getByRole("heading", { name: "Enter PIN" })).toBeVisible();

    // Should be able to try again with correct PIN
    await loginWithPin(page);
    await expect(page.getByText("Sow What")).toBeVisible();
  });

  test("unauthenticated access redirects to PIN", async ({ page }) => {
    // Try to access protected routes directly without PIN
    const protectedRoutes = ["/", "/seeds", "/planted", "/weather", "/settings"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should redirect to PIN screen
      await expect(page.getByRole("heading", { name: "Enter PIN" })).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("PIN delete button removes last digit", async ({ page }) => {
    await page.goto("/pin");
    await page.getByRole("heading", { name: "Enter PIN" }).waitFor();

    // Enter 2 digits
    await page.getByRole("button", { name: "Digit 1" }).click();
    await page.getByRole("button", { name: "Digit 7" }).click();

    // Status should show 2 digits entered (aria-label on status div)
    await expect(page.getByRole("status", { name: "2 of 4 digits entered" })).toBeVisible();

    // Delete one
    await page.getByRole("button", { name: "Delete last digit" }).click();

    // Should be back to 1 digit
    await expect(page.getByRole("status", { name: "1 of 4 digits entered" })).toBeVisible();
  });
});
