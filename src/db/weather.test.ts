import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "./database.ts";
import { createWeatherDAO } from "./weather.ts";

let dbCounter = 0;

const makeSnapshot = (overrides: Record<string, unknown> = {}) => ({
  date: "2026-03-15",
  tempHigh: 58,
  tempLow: 42,
  precipitation: 0.1,
  conditions: "Partly cloudy",
  rawJson: '{"test": true}',
  ...overrides,
});

describe("weather snapshots data access", () => {
  let db: SowWhatDB;
  let dbName: string;
  let dao: ReturnType<typeof createWeatherDAO>;

  beforeEach(async () => {
    dbName = `test-weather-${++dbCounter}`;
    db = new SowWhatDB(dbName);
    await db.open();
    dao = createWeatherDAO(db);
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete(dbName);
  });

  it("adds and retrieves a weather snapshot", async () => {
    const id = await dao.add(makeSnapshot());
    const retrieved = await dao.getById(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.date).toBe("2026-03-15");
    expect(retrieved!.tempHigh).toBe(58);
    expect(retrieved!.tempLow).toBe(42);
    expect(retrieved!.conditions).toBe("Partly cloudy");
  });

  it("retrieves snapshot by date", async () => {
    await dao.bulkAdd([
      makeSnapshot({ date: "2026-03-15" }),
      makeSnapshot({ date: "2026-03-16", tempHigh: 62 }),
    ]);

    const found = await dao.getByDate("2026-03-15");
    expect(found).toBeDefined();
    expect(found!.tempHigh).toBe(58);

    const notFound = await dao.getByDate("2026-01-01");
    expect(notFound).toBeUndefined();
  });

  it("retrieves all snapshots via bulkAdd", async () => {
    await dao.bulkAdd([
      makeSnapshot({ date: "2026-03-15" }),
      makeSnapshot({ date: "2026-03-16" }),
    ]);
    const all = await dao.getAll();
    expect(all).toHaveLength(2);
  });

  it("returns undefined for non-existent id", async () => {
    expect(await dao.getById(999)).toBeUndefined();
  });

  it("preserves rawJson field", async () => {
    const id = await dao.add(makeSnapshot());
    const retrieved = await dao.getById(id);
    expect(retrieved!.rawJson).toBe('{"test": true}');
  });
});
