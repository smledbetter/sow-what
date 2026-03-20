import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
  it("creates a planting and weather snapshot", async () => {
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db);

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

    const weatherDAO = createWeatherDAO(db);
    const snapshot = await weatherDAO.getById(result.weatherSnapshotId);
    expect(snapshot).toBeDefined();
    expect(snapshot!.date).toBe("2026-03-15");
    expect(snapshot!.conditions).toBe("Not recorded");
  });

  it("creates direct_sow planting", async () => {
    const result = await createPlantingRecord(2, "direct_sow", "2026-04-10", db);

    const plantingDAO = createPlantingDAO(db);
    const planting = await plantingDAO.getById(result.plantingId);
    expect(planting!.method).toBe("direct_sow");
  });

  it("creates independent records for different seeds", async () => {
    const r1 = await createPlantingRecord(1, "cold_sow", "2026-03-15", db);
    const r2 = await createPlantingRecord(2, "cold_sow", "2026-03-15", db);

    expect(r1.plantingId).not.toBe(r2.plantingId);
    expect(r1.weatherSnapshotId).not.toBe(r2.weatherSnapshotId);
  });
});

describe("removePlantingRecord", () => {
  it("removes planting and associated weather snapshot", async () => {
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db);

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
    const r1 = await createPlantingRecord(1, "cold_sow", "2026-03-15", db);
    const r2 = await createPlantingRecord(2, "cold_sow", "2026-03-15", db);

    await removePlantingRecord(r1.plantingId, db);

    const plantingDAO = createPlantingDAO(db);
    expect(await plantingDAO.getById(r1.plantingId)).toBeUndefined();
    expect(await plantingDAO.getById(r2.plantingId)).toBeDefined();
  });
});

describe("findPlantingForSeed", () => {
  it("finds existing planting by seedId, method, and date", async () => {
    const result = await createPlantingRecord(1, "cold_sow", "2026-03-15", db);

    const found = await findPlantingForSeed(1, "cold_sow", "2026-03-15", db);
    expect(found).toBe(result.plantingId);
  });

  it("returns undefined when no matching planting exists", async () => {
    const found = await findPlantingForSeed(1, "cold_sow", "2026-03-15", db);
    expect(found).toBeUndefined();
  });

  it("does not match different method", async () => {
    await createPlantingRecord(1, "cold_sow", "2026-03-15", db);

    const found = await findPlantingForSeed(1, "direct_sow", "2026-03-15", db);
    expect(found).toBeUndefined();
  });

  it("does not match different date", async () => {
    await createPlantingRecord(1, "cold_sow", "2026-03-15", db);

    const found = await findPlantingForSeed(1, "cold_sow", "2026-03-16", db);
    expect(found).toBeUndefined();
  });

  it("does not match different seedId", async () => {
    await createPlantingRecord(1, "cold_sow", "2026-03-15", db);

    const found = await findPlantingForSeed(2, "cold_sow", "2026-03-15", db);
    expect(found).toBeUndefined();
  });
});
