import { test, expect } from "@playwright/test";

test.describe("seed inventory", () => {
  test("add a seed, see it in list, edit it, delete it", async ({ page }) => {
    // Navigate to seeds page
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();
    await expect(
      page.getByText("No seeds yet. Add one or import a CSV.")
    ).toBeVisible();

    // Click Add button
    await page.getByLabel("Add seed").click();
    await expect(page.getByRole("heading", { name: "Add Seed" })).toBeVisible();

    // Fill in the form
    await page.getByPlaceholder("e.g., Lettuce").fill("Tomato");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Roma");
    await page.getByLabel("Purchased").check();

    // Submit
    await page.getByRole("button", { name: "Add Seed" }).click();

    // Should be back on seeds list with the new seed
    await expect(page.getByText("Seed Inventory")).toBeVisible();
    await expect(page.getByText("Tomato")).toBeVisible();
    await expect(page.getByText("Roma")).toBeVisible();
    await expect(page.getByText("1 seed")).toBeVisible();

    // Click the seed to edit
    await page.getByText("Tomato").click();
    await expect(
      page.getByRole("heading", { name: "Edit Seed" })
    ).toBeVisible();

    // Verify form has correct values
    const plantInput = page.getByPlaceholder("e.g., Lettuce");
    await expect(plantInput).toHaveValue("Tomato");

    // Edit the plant name
    await plantInput.clear();
    await plantInput.fill("Cherry Tomato");
    await page.getByRole("button", { name: "Save Changes" }).click();

    // Should be back on seeds list with updated name
    await expect(page.getByText("Seed Inventory")).toBeVisible();
    await expect(page.getByText("Cherry Tomato")).toBeVisible();

    // Click the seed to delete it
    await page.getByText("Cherry Tomato").click();
    await expect(
      page.getByRole("heading", { name: "Edit Seed" })
    ).toBeVisible();

    // Delete with confirmation
    await page.getByText("Delete Seed").click();
    await expect(
      page.getByText("Delete this seed? This cannot be undone.")
    ).toBeVisible();
    await page.getByText("Confirm Delete").click();

    // Should be back on seeds list, empty
    await expect(page.getByText("Seed Inventory")).toBeVisible();
    await expect(
      page.getByText("No seeds yet. Add one or import a CSV.")
    ).toBeVisible();
  });

  test("search filters seeds in real time", async ({ page }) => {
    await page.goto("/seeds");
    await expect(page.getByText("Seed Inventory")).toBeVisible();

    // Add two seeds
    await page.getByLabel("Add seed").click();
    await page.getByPlaceholder("e.g., Lettuce").fill("Lettuce");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Butter");
    await page.getByRole("button", { name: "Add Seed" }).click();
    await expect(page.getByText("Lettuce")).toBeVisible();

    await page.getByLabel("Add seed").click();
    await page.getByPlaceholder("e.g., Lettuce").fill("Tomato");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Roma");
    await page.getByRole("button", { name: "Add Seed" }).click();
    await expect(page.getByText("2 seeds")).toBeVisible();

    // Search for "tomato"
    await page.getByLabel("Search seeds").fill("tomato");
    await expect(page.getByText("Tomato")).toBeVisible();
    await expect(page.getByText("Lettuce")).not.toBeVisible();
    await expect(page.getByText("1 seed (of 2 total)")).toBeVisible();

    // Clear search
    await page.getByLabel("Search seeds").clear();
    await expect(page.getByText("2 seeds")).toBeVisible();
  });
});
