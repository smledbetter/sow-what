import type { Page } from "@playwright/test";

/** Clear all IndexedDB databases, sessionStorage, and block seed CSV bootstrap on reload */
export async function clearDB(page: Page) {
  await page.goto("/");
  // Block the bootstrap CSV fetch so seeds don't auto-import after clearing
  await page.route("**/seeds.csv", (route) => route.abort());
  await page.evaluate(async () => {
    // Clear sessionStorage (auth state)
    sessionStorage.clear();
    // Clear IndexedDB
    const databases = await indexedDB.databases();
    for (const db of databases) {
      if (db.name) indexedDB.deleteDatabase(db.name);
    }
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
}

/**
 * Enter the default PIN (1701) to authenticate.
 * Call after clearDB or page.goto when the app redirects to /pin.
 */
export async function loginWithPin(page: Page, pin = "1701") {
  // Wait for PIN pad to load
  await page.getByRole("heading", { name: "Enter PIN" }).waitFor();
  for (const digit of pin) {
    await page.getByRole("button", { name: `Digit ${digit}` }).click();
  }
  // Wait for redirect away from PIN screen
  await page.waitForURL((url) => !url.pathname.includes("/pin"));
}
