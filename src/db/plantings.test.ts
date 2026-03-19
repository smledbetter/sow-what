import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "./database.ts";
import { createPlantingDAO } from "./plantings.ts";

let dbCounter = 0;

const makePlanting = (overrides: Record<string, unknown> = {}) => ({
  seedId: 1,
  method: "cold_sow" as const,
  datePlanted: "2026-03-15",
  bedLocation: "Raised bed A",
  germinationDate: "",
  expectedHarvest: "",
  weatherSnapshotId: 1,
  ...overrides,
});

describe("plantings data access", () => {
  let db: SowWhatDB;
  let dbName: string;
  let dao: ReturnType<typeof createPlantingDAO>;

  beforeEach(async () => {
    dbName = `test-plantings-${++dbCounter}`;
    db = new SowWhatDB(dbName);
    await db.open();
    dao = createPlantingDAO(db);
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete(dbName);
  });

  it("adds a planting and retrieves it", async () => {
    const id = await dao.add(makePlanting());
    const retrieved = await dao.getById(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.seedId).toBe(1);
    expect(retrieved!.method).toBe("cold_sow");
    expect(retrieved!.datePlanted).toBe("2026-03-15");
  });

  it("retrieves all plantings via bulkAdd", async () => {
    await dao.bulkAdd([
      makePlanting(),
      makePlanting({ method: "direct_sow", seedId: 2 }),
    ]);
    const all = await dao.getAll();
    expect(all).toHaveLength(2);
  });

  it("updates a planting", async () => {
    const id = await dao.add(makePlanting());
    await dao.update(id, {
      bedLocation: "Bed B",
      germinationDate: "2026-03-25",
    });
    const updated = await dao.getById(id);
    expect(updated!.bedLocation).toBe("Bed B");
    expect(updated!.germinationDate).toBe("2026-03-25");
  });

  it("deletes a planting", async () => {
    const id = await dao.add(makePlanting());
    await dao.delete(id);
    const deleted = await dao.getById(id);
    expect(deleted).toBeUndefined();
  });

  it("filters by sow method", async () => {
    await dao.bulkAdd([
      makePlanting({ method: "cold_sow" }),
      makePlanting({ method: "direct_sow" }),
      makePlanting({ method: "cold_sow" }),
    ]);

    const cold = await dao.getByMethod("cold_sow");
    expect(cold).toHaveLength(2);

    const direct = await dao.getByMethod("direct_sow");
    expect(direct).toHaveLength(1);
  });

  it("filters by seedId", async () => {
    await dao.bulkAdd([
      makePlanting({ seedId: 1 }),
      makePlanting({ seedId: 2 }),
      makePlanting({ seedId: 1 }),
    ]);

    const forSeed1 = await dao.getBySeedId(1);
    expect(forSeed1).toHaveLength(2);

    const forSeed2 = await dao.getBySeedId(2);
    expect(forSeed2).toHaveLength(1);
  });

  it("returns undefined for non-existent planting", async () => {
    expect(await dao.getById(999)).toBeUndefined();
  });
});
