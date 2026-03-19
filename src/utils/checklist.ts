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

/** Filter seeds that are in the sow window for the given method and date. */
export function getSeedsForDate(
  seeds: Seed[],
  method: SowMethod,
  date: string
): Seed[] {
  return seeds.filter((seed) => {
    if (method === "cold_sow") {
      return isInSowWindow(date, seed.coldSowStart, seed.coldSowEnd);
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
