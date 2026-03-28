import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createWeatherDAO } from "../db/weather.ts";
import {
  createPlantingRecord,
  removePlantingRecord,
  findPlantingForSeed,
} from "./planting.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

/** Mock fetch that returns realistic weather data — never hits Open-Meteo */
const mockFetchFn: typeof fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () =>
    Promise.resolve({
      current: {
        time: "2026-03-15T12:00",
        temperature_2m: 52.0,
        apparent_temperature: 48.0,
        precipitation: 0.0,
        weather_code: 2,
        wind_speed_10m: 6.0,
      },
      daily: {
        time: ["2026-03-15", "2026-03-16", "2026-04-10"],
        temperature_2m_max: [55.0, 50.0, 65.0],
        temperature_2m_min: [38.0, 33.0, 45.0],
        precipitation_sum: [0.0, 0.1, 0.0],
        weather_code: [2, 61, 0],
      },
    }),
});

beforeEach(async () => {
  dbName = `test-planting-util-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("createPlantingRecord", () => {
  it("creates a planting and weather snapshot with real weather", async () => {
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);

    expect(result.plantingId).toBeGreaterThan(0);
    expect(result.weatherSnapshotId).toBeGreaterThan(0);

    const plantingDAO = createPlantingDAO(db);
    const planting = await plantingDAO.getById(result.plantingId);
    expect(planting).toBeDefined();
    expect(planting!.seedId).toBe(1);
    expect(planting!.method).toBe("cold_sow");
    expect(planting!.datePlanted).toBe("2026-03-15");
    expect(planting!.bedLocation).toBe("");
    expect(planting!.weatherSnapshotId).toBe(result.weatherSnapshotId);
    expect(planting!.plantedAt).toBeDefined();
    expect(new Date(planting!.plantedAt).getTime()).not.toBeNaN();

    const weatherDAO = createWeatherDAO(db);
    const snapshot = await weatherDAO.getById(result.weatherSnapshotId);
    expect(snapshot).toBeDefined();
    expect(snapshot!.date).toBe("2026-03-15");
    // Real weather, not stub zeros
    expect(snapshot!.tempHigh).toBe(55.0);
    expect(snapshot!.tempLow).toBe(38.0);
    expect(snapshot!.conditions).toBe("Partly cloudy");
  });

  it("creates direct_sow planting", async () => {
    const result = await createPlantingRecord(2, "direct_sow", "2026-04-10", db, mockFetchFn);

    const plantingDAO = createPlantingDAO(db);
    const planting = await plantingDAO.getById(result.plantingId);
    expect(planting!.method).toBe("direct_sow");
  });

  it("creates independent records for different seeds", async () => {
    const r1 = await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);
    const r2 = await createPlantingRecord(2, "cold_sow", "2026-03-15", db, mockFetchFn);

    expect(r1.plantingId).not.toBe(r2.plantingId);
    expect(r1.weatherSnapshotId).not.toBe(r2.weatherSnapshotId);
  });

  it("falls back to stub when fetch fails", async () => {
    const failFetch = vi.fn().mockRejectedValue(new Error("offline"));
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db, failFetch);

    const weatherDAO = createWeatherDAO(db);
    const snapshot = await weatherDAO.getById(result.weatherSnapshotId);
    expect(snapshot).toBeDefined();
    expect(snapshot!.conditions).toBe("Not recorded");
    expect(snapshot!.tempHigh).toBe(0);
  });
});

describe("removePlantingRecord", () => {
  it("removes planting and associated weather snapshot", async () => {
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);

    await removePlantingRecord(result.plantingId, db);

    const plantingDAO = createPlantingDAO(db);
    const planting = await plantingDAO.getById(result.plantingId);
    expect(planting).toBeUndefined();

    const weatherDAO = createWeatherDAO(db);
    const snapshot = await weatherDAO.getById(result.weatherSnapshotId);
    expect(snapshot).toBeUndefined();
  });

  it("does nothing for non-existent planting", async () => {
    // Should not throw
    await removePlantingRecord(999, db);
  });

  it("removes only the targeted planting", async () => {
    const r1 = await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);
    const r2 = await createPlantingRecord(2, "cold_sow", "2026-03-15", db, mockFetchFn);

    await removePlantingRecord(r1.plantingId, db);

    const plantingDAO = createPlantingDAO(db);
    expect(await plantingDAO.getById(r1.plantingId)).toBeUndefined();
    expect(await plantingDAO.getById(r2.plantingId)).toBeDefined();
  });
});

describe("findPlantingForSeed", () => {
  it("finds existing planting by seedId, method, and date", async () => {
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);

    const found = await findPlantingForSeed(1, "cold_sow", "2026-03-15", db);
    expect(found).toBe(result.plantingId);
  });

  it("returns undefined when no matching planting exists", async () => {
    const found = await findPlantingForSeed(1, "cold_sow", "2026-03-15", db);
    expect(found).toBeUndefined();
  });

  it("does not match different method", async () => {
    await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);

    const found = await findPlantingForSeed(1, "direct_sow", "2026-03-15", db);
    expect(found).toBeUndefined();
  });

  it("does not match different date", async () => {
    await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);

    const found = await findPlantingForSeed(1, "cold_sow", "2026-03-16", db);
    expect(found).toBeUndefined();
  });

  it("does not match different seedId", async () => {
    await createPlantingRecord(1, "cold_sow", "2026-03-15", db, mockFetchFn);

    const found = await findPlantingForSeed(2, "cold_sow", "2026-03-15", db);
    expect(found).toBeUndefined();
  });
});
