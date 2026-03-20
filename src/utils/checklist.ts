/** Checklist query: filter seeds whose sow window includes a given date. */

import type { Seed, SowMethod } from "../types/index.ts";

export interface ChecklistItem {
  seed: Seed;
  checked: boolean;
}

/** Returns true if `date` falls within [start, end] inclusive.
 * Both start and end must be non-empty ISO date strings.
 * If either is empty, returns false (no valid window).
 */
export function isInSowWindow(
  date: string,
  start: string,
  end: string
): boolean {
  if (!start || !end || !date) return false;
  return date >= start && date <= end;
}

/** Returns true if `date` is at or past the start of [start, end].
 * Once the window opens, the seed stays on the checklist.
 */
export function isAtOrPastWindow(date: string, start: string): boolean {
  if (!start || !date) return false;
  return date >= start;
}

/** Filter seeds that are in the sow window for the given method and date.
 * Cold sow: shows if today >= coldSowStart (once the window opens, it stays).
 * Direct sow: shows if today is within [directSowStart, directSowEnd].
 */
export function getSeedsForDate(
  seeds: Seed[],
  method: SowMethod,
  date: string
): Seed[] {
  return seeds.filter((seed) => {
    if (method === "cold_sow") {
      return isAtOrPastWindow(date, seed.coldSowStart);
    }
    return isInSowWindow(date, seed.directSowStart, seed.directSowEnd);
  });
}

/** Get today's date as ISO string (YYYY-MM-DD). */
export function todayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
