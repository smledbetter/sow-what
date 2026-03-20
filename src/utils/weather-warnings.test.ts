import { describe, it, expect } from "vitest";
import { getPlantingWarnings, shortDayLabel } from "./weather-warnings.ts";
import type { ForecastDay } from "./weather-client.ts";

const makeDay = (overrides: Partial<ForecastDay> = {}): ForecastDay => ({
  date: "2026-03-20",
  tempMax: 55,
  tempMin: 40,
  precipitation: 0.1,
  weatherCode: 1,
  description: "Mainly clear",
  hasFrostWarning: false,
  ...overrides,
});

describe("getPlantingWarnings", () => {
  it("returns empty for benign forecast", () => {
    const forecast = [makeDay(), makeDay({ date: "2026-03-21" })];
    expect(getPlantingWarnings(forecast)).toEqual([]);
  });

  it("detects frost (tempMin <= 32)", () => {
    const forecast = [
      makeDay({ date: "2026-03-20", tempMin: 28 }),
      makeDay({ date: "2026-03-21", tempMin: 45 }),
    ];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].label).toBe("Frost");
    expect(warnings[0].days).toEqual(["2026-03-20"]);
  });

  it("detects heavy rain (>= 1.0 inch)", () => {
    const forecast = [
      makeDay({ date: "2026-03-20", precipitation: 1.5 }),
    ];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings.some((w) => w.label === "Heavy rain")).toBe(true);
  });

  it("does not flag moderate rain (< 1.0 inch)", () => {
    const forecast = [makeDay({ precipitation: 0.8 })];
    expect(getPlantingWarnings(forecast)).toEqual([]);
  });

  it("detects extreme heat (>= 95F)", () => {
    const forecast = [makeDay({ tempMax: 98 })];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings.some((w) => w.label === "Extreme heat")).toBe(true);
  });

  it("detects severe storms (WMO code >= 95)", () => {
    const forecast = [makeDay({ weatherCode: 95 })];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings.some((w) => w.label === "Severe storms")).toBe(true);
  });

  it("does not duplicate storm warning if already heavy rain", () => {
    const forecast = [
      makeDay({ precipitation: 2.0, weatherCode: 95 }),
    ];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings.some((w) => w.label === "Heavy rain")).toBe(true);
    expect(warnings.some((w) => w.label === "Severe storms")).toBe(false);
  });

  it("returns multiple warnings for multiple conditions", () => {
    const forecast = [
      makeDay({ date: "2026-03-20", tempMin: 30 }),
      makeDay({ date: "2026-03-22", precipitation: 1.5 }),
    ];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings).toHaveLength(2);
  });

  it("frost at exactly 32F triggers warning", () => {
    const forecast = [makeDay({ tempMin: 32 })];
    const warnings = getPlantingWarnings(forecast);
    expect(warnings.some((w) => w.label === "Frost")).toBe(true);
  });
});

describe("shortDayLabel", () => {
  it("returns 'Today' for matching date", () => {
    expect(shortDayLabel("2026-03-20", "2026-03-20")).toBe("Today");
  });

  it("returns weekday abbreviation for other dates", () => {
    const label = shortDayLabel("2026-03-21", "2026-03-20");
    expect(label).toBe("Sat");
  });
});
