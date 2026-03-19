import { describe, it, expect } from "vitest";
import { isInSowWindow, getSeedsForDate, todayISO } from "./checklist.ts";
import type { Seed } from "../types/index.ts";

const makeSeed = (overrides: Partial<Seed> = {}): Seed => ({
  id: 1,
  plant: "Lettuce",
  varietal: "Forellenschluss",
  seedOrStart: "Seed",
  purchased: true,
  coldSowStart: "2026-02-20",
  coldSowEnd: "2026-03-10",
  directSowStart: "2026-04-01",
  directSowEnd: "2026-05-15",
  soilTempMin: 40,
  soilTempMax: 75,
  notes: "",
  ...overrides,
});

describe("isInSowWindow", () => {
  it("returns true when date is within window", () => {
    expect(isInSowWindow("2026-03-05", "2026-03-01", "2026-03-10")).toBe(true);
  });

  it("returns true when date equals start", () => {
    expect(isInSowWindow("2026-03-01", "2026-03-01", "2026-03-10")).toBe(true);
  });

  it("returns true when date equals end", () => {
    expect(isInSowWindow("2026-03-10", "2026-03-01", "2026-03-10")).toBe(true);
  });

  it("returns false when date is before window", () => {
    expect(isInSowWindow("2026-02-28", "2026-03-01", "2026-03-10")).toBe(false);
  });

  it("returns false when date is after window", () => {
    expect(isInSowWindow("2026-03-11", "2026-03-01", "2026-03-10")).toBe(false);
  });

  it("returns false when start is empty", () => {
    expect(isInSowWindow("2026-03-05", "", "2026-03-10")).toBe(false);
  });

  it("returns false when end is empty", () => {
    expect(isInSowWindow("2026-03-05", "2026-03-01", "")).toBe(false);
  });

  it("returns false when date is empty", () => {
    expect(isInSowWindow("", "2026-03-01", "2026-03-10")).toBe(false);
  });
});

describe("getSeedsForDate", () => {
  const seeds: Seed[] = [
    makeSeed({ id: 1, plant: "Lettuce", coldSowStart: "2026-02-20", coldSowEnd: "2026-03-10" }),
    makeSeed({ id: 2, plant: "Tomato", coldSowStart: "2026-03-15", coldSowEnd: "2026-04-15" }),
    makeSeed({ id: 3, plant: "Pepper", coldSowStart: "", coldSowEnd: "" }),
  ];

  it("returns seeds in cold sow window for the given date", () => {
    const result = getSeedsForDate(seeds, "cold_sow", "2026-03-05");
    expect(result).toHaveLength(1);
    expect(result[0].plant).toBe("Lettuce");
  });

  it("returns multiple seeds when overlapping windows", () => {
    const result = getSeedsForDate(seeds, "cold_sow", "2026-03-20");
    expect(result).toHaveLength(1);
    expect(result[0].plant).toBe("Tomato");
  });

  it("returns empty array when no seeds match", () => {
    const result = getSeedsForDate(seeds, "cold_sow", "2026-06-01");
    expect(result).toHaveLength(0);
  });

  it("excludes seeds with empty sow windows", () => {
    const result = getSeedsForDate(seeds, "cold_sow", "2026-03-05");
    expect(result.find((s) => s.plant === "Pepper")).toBeUndefined();
  });

  it("filters by direct sow method", () => {
    const directSeeds: Seed[] = [
      makeSeed({ id: 1, directSowStart: "2026-04-01", directSowEnd: "2026-05-15" }),
      makeSeed({ id: 2, directSowStart: "2026-06-01", directSowEnd: "2026-07-15" }),
    ];
    const result = getSeedsForDate(directSeeds, "direct_sow", "2026-04-10");
    expect(result).toHaveLength(1);
  });

  it("returns empty for empty seed list", () => {
    const result = getSeedsForDate([], "cold_sow", "2026-03-05");
    expect(result).toHaveLength(0);
  });
});

describe("todayISO", () => {
  it("returns a valid ISO date string", () => {
    const today = todayISO();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's date", () => {
    const today = todayISO();
    const now = new Date();
    const expected = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
    expect(today).toBe(expected);
  });
});
