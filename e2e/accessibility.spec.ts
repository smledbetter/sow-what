import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  { path: "/", name: "Home" },
  { path: "/seeds", name: "Seeds" },
  { path: "/planted", name: "Planted" },
  { path: "/seeds/new", name: "Add Seed" },
  { path: "/weather", name: "Weather" },
];

for (const route of routes) {
  test(`${route.name} (${route.path}) has no WCAG 2.1 AA violations`, async ({ page }) => {
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
