import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { exportBackup, importBackup, parseBackupFile } from "./backup.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createWeatherDAO } from "../db/weather.ts";
import { createSettingsDAO } from "../db/settings.ts";
import type { Seed, Planting, WeatherSnapshot } from "../types/index.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

const testSeed: Omit<Seed, "id"> = {
  plant: "Tomato",
  varietal: "Roma",
  seedOrStart: "Seed",
  purchased: true,
  coldSowStart: "2026-02-15",
  coldSowEnd: "2026-03-15",
  directSowStart: "2026-05-01",
  directSowEnd: "2026-06-15",
  soilTempMin: 60,
  soilTempMax: 85,
  notes: "Test",
};

const testPlanting: Omit<Planting, "id"> = {
  seedId: 1,
  method: "direct_sow",
  datePlanted: "2026-05-10",
  plantedAt: "2026-05-10T14:00:00.000Z",
  bedLocation: "Bed A",
  germinationDate: "",
  expectedHarvest: "",
  weatherSnapshotId: 1,
};

const testWeather: Omit<WeatherSnapshot, "id"> = {
  date: "2026-05-10",
  tempHigh: 72,
  tempLow: 48,
  precipitation: 0,
  conditions: "Sunny",
  rawJson: "{}",
};

beforeEach(async () => {
  dbName = `test-backup-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("exportBackup", () => {
  it("exports all tables", async () => {
    await createSeedDAO(db).add(testSeed);
    await createWeatherDAO(db).add(testWeather);
    await createPlantingDAO(db).add(testPlanting);
    await createSettingsDAO(db).set("pin", "1234");

    const data = await exportBackup(db);

    expect(data.version).toBe(1);
    expect(data.exportedAt).toBeTruthy();
    expect(data.seeds).toHaveLength(1);
    expect(data.seeds[0].plant).toBe("Tomato");
    expect(data.plantings).toHaveLength(1);
    expect(data.weatherSnapshots).toHaveLength(1);
    expect(data.settings).toHaveLength(1);
  });

  it("exports empty database", async () => {
    const data = await exportBackup(db);
    expect(data.seeds).toHaveLength(0);
    expect(data.plantings).toHaveLength(0);
    expect(data.weatherSnapshots).toHaveLength(0);
    expect(data.settings).toHaveLength(0);
  });
});

describe("importBackup", () => {
  it("restores all tables and clears existing data", async () => {
    // Add existing data that should be replaced
    await createSeedDAO(db).add({ ...testSeed, plant: "OldPlant" });

    const backup = {
      version: 1 as const,
      exportedAt: "2026-03-28T00:00:00.000Z",
      seeds: [{ ...testSeed, id: 1, plant: "NewTomato" }],
      plantings: [{ ...testPlanting, id: 1 }],
      weatherSnapshots: [{ ...testWeather, id: 1 }],
      settings: [{ key: "pin", value: "5678" }],
    };

    const counts = await importBackup(db, backup);

    expect(counts.seeds).toBe(1);
    expect(counts.plantings).toBe(1);
    expect(counts.weatherSnapshots).toBe(1);
    expect(counts.settings).toBe(1);

    const seeds = await createSeedDAO(db).getAll();
    expect(seeds).toHaveLength(1);
    expect(seeds[0].plant).toBe("NewTomato");
  });
});

describe("parseBackupFile", () => {
  it("parses valid backup JSON", () => {
    const json = JSON.stringify({
      version: 1,
      exportedAt: "2026-03-28T00:00:00.000Z",
      seeds: [],
      plantings: [],
      weatherSnapshots: [],
      settings: [],
    });
    const data = parseBackupFile(json);
    expect(data.version).toBe(1);
  });

  it("rejects unsupported version", () => {
    const json = JSON.stringify({ version: 99, seeds: [], plantings: [], weatherSnapshots: [], settings: [] });
    expect(() => parseBackupFile(json)).toThrow("Unsupported backup version");
  });

  it("rejects missing tables", () => {
    const json = JSON.stringify({ version: 1, seeds: [] });
    expect(() => parseBackupFile(json)).toThrow("missing required tables");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseBackupFile("not json")).toThrow();
  });
});
