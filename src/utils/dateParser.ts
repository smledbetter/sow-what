/** Fuzzy date parser for gardening date labels.
 *
 * Maps labels like "Late Feb", "Early March", "Mid April" to concrete
 * ISO date ranges (YYYY-MM-DD). Also handles specific ranges ("Apr 20-27")
 * and compound ranges ("Late Feb-Early March").
 */

export interface DateRange {
  start: string; // ISO date YYYY-MM-DD
  end: string;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Parse a single fuzzy label like "Early March", "Mid Feb", "Late April" */
function parseSingleLabel(label: string, year: number): DateRange | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  // Match "Early/Mid/Late Month"
  const fuzzyMatch = trimmed.match(/^(early|mid|late)\s+(\w+)$/i);
  if (fuzzyMatch) {
    const qualifier = fuzzyMatch[1].toLowerCase();
    const monthStr = fuzzyMatch[2].toLowerCase();
    const month = MONTH_MAP[monthStr];
    if (month === undefined) return null;

    const lastDay = lastDayOfMonth(year, month);

    switch (qualifier) {
      case "early":
        return { start: isoDate(year, month, 1), end: isoDate(year, month, 10) };
      case "mid":
        return { start: isoDate(year, month, 11), end: isoDate(year, month, 20) };
      case "late":
        return { start: isoDate(year, month, 20), end: isoDate(year, month, lastDay) };
      default:
        return null;
    }
  }

  // Match "Month day-day" (e.g., "Apr 20-27")
  const specificMatch = trimmed.match(/^(\w+)\s+(\d{1,2})-(\d{1,2})$/i);
  if (specificMatch) {
    const monthStr = specificMatch[1].toLowerCase();
    const month = MONTH_MAP[monthStr];
    if (month === undefined) return null;

    const startDay = parseInt(specificMatch[2], 10);
    const endDay = parseInt(specificMatch[3], 10);
    const lastDay = lastDayOfMonth(year, month);

    if (startDay < 1 || startDay > lastDay || endDay < 1 || endDay > lastDay) {
      return null;
    }

    return { start: isoDate(year, month, startDay), end: isoDate(year, month, endDay) };
  }

  return null;
}

/** Parse a date label that may be a single label or a compound range.
 *
 * Compound ranges use a hyphen between two labels: "Late Feb-Early March"
 *
 * @param label The fuzzy date label
 * @param year The season year (used to resolve month/day)
 * @returns A DateRange or null if the label can't be parsed
 */
export function parseDateLabel(label: string, year: number): DateRange | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  // Try single label first
  const single = parseSingleLabel(trimmed, year);
  if (single) return single;

  // Try compound: split on hyphen between two fuzzy labels
  // Pattern: "Late Feb-Early March" or "Early March-Mid April"
  // We need to be careful not to split "Apr 20-27" (already handled above)
  const compoundMatch = trimmed.match(
    /^((?:early|mid|late)\s+\w+)\s*-\s*((?:early|mid|late)\s+\w+)$/i
  );
  if (compoundMatch) {
    const startRange = parseSingleLabel(compoundMatch[1], year);
    const endRange = parseSingleLabel(compoundMatch[2], year);
    if (startRange && endRange) {
      return { start: startRange.start, end: endRange.end };
    }
  }

  return null;
}
