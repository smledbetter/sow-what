import { test, expect } from "@playwright/test";
import { clearDB } from "./helpers.ts";

test.describe("daily checklist", () => {
  test("shows home screen with tabs and empty state", async ({ page }) => {
    await clearDB(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sow What" })).toBeVisible();
    // Tabs are buttons with role="tab"
    await expect(page.getByText("Cold Sow")).toBeVisible();
    await expect(page.getByText("Direct Sow")).toBeVisible();
    await expect(page.getByText("Nothing to sow today")).toBeVisible();
  });

  test("add seed with today's date window, see it on checklist, check it off", async ({ page }) => {
    await clearDB(page);
    // First, add a seed with a cold sow window that includes today
    await page.goto("/seeds");
    await page.getByLabel("Add seed").click();
    await page.getByPlaceholder("e.g., Lettuce").fill("Spinach");
    await page.getByPlaceholder("e.g., Forellenschluss").fill("Bloomsdale");

    // Set cold sow window to include today (today - 5 days to today + 5 days)
    const today = new Date();

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 5);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 5);

    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    };

    // The form has sections: "Cold Sow Window" with Start/End, "Soil Temperature" with Min/Max
    // Use section headings to locate the right fields
    // Form has: Cold Sow Start (1st), Cold Sow End (2nd), Direct Sow Start (3rd), Direct Sow End (4th)
    // Soil Min, Soil Max are number inputs
    await page.getByRole("textbox", { name: "Start" }).first().fill(formatDate(startDate));
    await page.getByRole("textbox", { name: "End" }).first().fill(formatDate(endDate));

    await page.getByRole("spinbutton", { name: "Min" }).fill("35");
    await page.getByRole("spinbutton", { name: "Max" }).fill("65");

    await page.getByRole("button", { name: "Add Seed" }).click();
    await expect(page.getByText("Spinach")).toBeVisible();

    // Navigate to home (checklist)
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sow What" })).toBeVisible();

    // Spinach should appear in Cold Sow tab
    await expect(page.getByText("Spinach")).toBeVisible();
    await expect(page.getByText("Bloomsdale")).toBeVisible();
    await expect(page.getByText("35-65\u00B0F")).toBeVisible();

    // Click to check off — should get strike-through
    await page.getByText("Spinach").click();
    const plantName = page.getByText("Spinach");
    await expect(plantName).toHaveCSS("text-decoration-line", "line-through");

    // Click again to uncheck
    await page.getByText("Spinach").click();
    await expect(plantName).not.toHaveCSS("text-decoration-line", "line-through");
  });

  test("switch between Cold Sow and Direct Sow tabs", async ({ page }) => {
    await page.goto("/");
    // Cold Sow selected by default
    const coldTab = page.getByText("Cold Sow");
    const directTab = page.getByText("Direct Sow");
    await expect(coldTab).toBeVisible();
    await expect(directTab).toBeVisible();

    // Switch to Direct Sow
    await directTab.click();
    // Both tabs remain visible
    await expect(coldTab).toBeVisible();
    await expect(directTab).toBeVisible();
  });
});
