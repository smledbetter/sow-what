import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithPin } from "./helpers.ts";

// PIN page is accessible without auth
test("Pin (/pin) has no WCAG 2.1 AA violations", async ({ page }) => {
  await page.goto("/pin");
  await page.waitForLoadState("networkidle");
  // Wait for PIN pad to render (after loading state)
  await page.getByRole("heading", { name: "Enter PIN" }).waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const violations = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    description: v.description,
    nodes: v.nodes.length,
  }));

  expect(violations, `AA violations on /pin: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
});

// Protected routes need auth first
const protectedRoutes = [
  { path: "/", name: "Home" },
  { path: "/seeds", name: "Seeds" },
  { path: "/planted", name: "Planted" },
  { path: "/seeds/new", name: "Add Seed" },
  { path: "/weather", name: "Weather" },
  { path: "/settings", name: "Settings" },
];

for (const route of protectedRoutes) {
  test(`${route.name} (${route.path}) has no WCAG 2.1 AA violations`, async ({ page }) => {
    // Authenticate first
    await page.goto("/");
    await loginWithPin(page);
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const violations = results.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.length,
    }));

    expect(violations, `AA violations on ${route.path}: ${JSON.stringify(violations, null, 2)}`).toEqual([]);
  });
}
