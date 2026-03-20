import type { Page } from "@playwright/test";

/** Clear all IndexedDB databases and block seed CSV bootstrap on reload */
export async function clearDB(page: Page) {
  await page.goto("/");
  // Block the bootstrap CSV fetch so seeds don't auto-import after clearing
  await page.route("**/seeds.csv", (route) => route.abort());
  await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}
