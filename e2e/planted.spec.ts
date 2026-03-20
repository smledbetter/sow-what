import { test, expect } from "@playwright/test";
import { clearDB } from "./helpers.ts";

test.describe("planted list", () => {
  test("shows empty state when no plantings", async ({ page }) => {
    await clearDB(page);
    await page.goto("/planted");
    await expect(page.getByRole("heading", { name: "Planted" })).toBeVisible();
    await expect(page.getByText("No plantings yet")).toBeVisible();
    await expect(page.getByRole("button", { name: "Go to Checklist" })).toBeVisible();
  });

  test("full planting journey: add seed -> checklist -> check off -> planted list", async ({ page }) => {
    await clearDB(page);
    // Step 1: Add a seed with a cold sow window that includes today
    await page.goto("/seeds");
    await page.getByLabel("Add seed").click();
    await page.getByPlaceholder("e.g., Lettuce").fill("Kale");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Lacinato");

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 5);

    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    };

    await page.getByRole("textbox", { name: "Start" }).first().fill(formatDate(startDate));
    await page.getByRole("textbox", { name: "End" }).first().fill(formatDate(endDate));
    await page.getByRole("spinbutton", { name: "Min" }).fill("40");
    await page.getByRole("spinbutton", { name: "Max" }).fill("70");
    await page.getByRole("button", { name: "Add Seed" }).click();
    await expect(page.getByText("Kale")).toBeVisible();

    // Step 2: Go to checklist and check off the seed
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sow What" })).toBeVisible();
    await expect(page.getByText("Kale")).toBeVisible();
    await page.getByText("Kale").click();
    // Verify check-off visual
    const plantName = page.getByText("Kale");
    await expect(plantName).toHaveCSS("text-decoration-line", "line-through");

    // Step 3: Navigate to planted list
    await page.goto("/planted");
    await expect(page.getByRole("heading", { name: "Planted" })).toBeVisible();

    // Kale should appear in the planted list
    await expect(page.getByText("Kale")).toBeVisible();
    await expect(page.getByText("Lacinato")).toBeVisible();
    // Verify the method label appears in the planting list item
    await expect(page.getByRole("list", { name: "Plantings" }).getByText("Cold Sow")).toBeVisible();

    // Step 4: Click to view planting detail
    await page.getByText("Kale").click();
    await expect(page.getByText("Back to Planted")).toBeVisible();
    await expect(page.getByText(/Kale/)).toBeVisible();
    await expect(page.getByText(/Lacinato/)).toBeVisible();
  });

  test("sort and filter controls work", async ({ page }) => {
    await clearDB(page);
    // First, create two plantings via the UI: one cold_sow and one direct_sow
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 5);

    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    };

    // Add seed 1 with cold sow window
    await page.goto("/seeds");
    await page.getByLabel("Add seed").click();
    await page.getByPlaceholder("e.g., Lettuce").fill("Basil");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Genovese");
    await page.getByRole("textbox", { name: "Start" }).first().fill(formatDate(startDate));
    await page.getByRole("textbox", { name: "End" }).first().fill(formatDate(endDate));
    await page.getByRole("spinbutton", { name: "Min" }).fill("50");
    await page.getByRole("spinbutton", { name: "Max" }).fill("80");
    await page.getByRole("button", { name: "Add Seed" }).click();
    await expect(page.getByText("Basil")).toBeVisible();

    // Add seed 2 with direct sow window
    await page.getByLabel("Add seed").click();
    await page.getByPlaceholder("e.g., Lettuce").fill("Carrot");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Nantes");
    // Set direct sow window (3rd and 4th textboxes)
    await page.getByRole("textbox", { name: "Start" }).nth(1).fill(formatDate(startDate));
    await page.getByRole("textbox", { name: "End" }).nth(1).fill(formatDate(endDate));
    await page.getByRole("spinbutton", { name: "Min" }).fill("45");
    await page.getByRole("spinbutton", { name: "Max" }).fill("75");
    await page.getByRole("button", { name: "Add Seed" }).click();
    await expect(page.getByText("Carrot")).toBeVisible();

    // Check off Basil on cold sow tab
    await page.goto("/");
    await expect(page.getByText("Basil")).toBeVisible();
    await page.getByText("Basil").click();
    // Wait for check-off visual confirmation (opacity changes to 0.6)
    await expect(page.locator("li", { hasText: "Basil" })).toHaveCSS("opacity", "0.6");

    // Switch to direct sow tab and check off Carrot
    await page.getByText("Direct Sow").click();
    await expect(page.getByText("Carrot")).toBeVisible();
    await page.getByText("Carrot").click();
    // Wait for check-off visual confirmation
    await expect(page.locator("li", { hasText: "Carrot" })).toHaveCSS("opacity", "0.6");

    // Go to planted list
    await page.goto("/planted");
    await expect(page.getByText("Basil")).toBeVisible();
    await expect(page.getByText("Carrot")).toBeVisible();

    // Filter by Cold Sow — only Basil should remain
    await page.getByRole("group", { name: "Filter options" }).getByText("Cold Sow").click();
    await expect(page.getByText("Basil")).toBeVisible();
    await expect(page.getByText("Carrot")).not.toBeVisible();

    // Filter by Direct Sow — only Carrot should remain
    await page.getByRole("group", { name: "Filter options" }).getByText("Direct Sow").click();
    await expect(page.getByText("Carrot")).toBeVisible();
    await expect(page.getByText("Basil")).not.toBeVisible();

    // Reset filter
    await page.getByRole("group", { name: "Filter options" }).getByText("All").click();
    await expect(page.getByText("Basil")).toBeVisible();
    await expect(page.getByText("Carrot")).toBeVisible();
  });
});
