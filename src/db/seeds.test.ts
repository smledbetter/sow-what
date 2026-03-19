import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "./database.ts";
import { createSeedDAO } from "./seeds.ts";

let dbCounter = 0;

const makeSeed = (overrides: Record<string, unknown> = {}) => ({
  plant: "Lettuce",
  varietal: "Forellenschluss",
  seedOrStart: "Seed" as const,
  purchased: true,
  coldSowStart: "2026-02-20",
  coldSowEnd: "2026-03-10",
  directSowStart: "2026-04-01",
  directSowEnd: "2026-05-15",
  soilTempMin: 40,
  soilTempMax: 75,
  notes: "Shade tolerant",
  ...overrides,
});

describe("seeds data access", () => {
  let db: SowWhatDB;
  let dbName: string;
  let dao: ReturnType<typeof createSeedDAO>;

  beforeEach(async () => {
    dbName = `test-seeds-${++dbCounter}`;
    db = new SowWhatDB(dbName);
    await db.open();
    dao = createSeedDAO(db);
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete(dbName);
  });

  it("starts with zero seeds", async () => {
    expect(await dao.count()).toBe(0);
  });

  it("adds a seed and retrieves it by id", async () => {
    const id = await dao.add(makeSeed());
    expect(id).toBeGreaterThan(0);

    const retrieved = await dao.getById(id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.plant).toBe("Lettuce");
    expect(retrieved!.varietal).toBe("Forellenschluss");
  });

  it("retrieves all seeds via bulkAdd", async () => {
    await dao.bulkAdd([
      makeSeed(),
      makeSeed({ plant: "Tomato", varietal: "Brandywine" }),
    ]);

    const all = await dao.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((s) => s.plant).sort()).toEqual(["Lettuce", "Tomato"]);
  });

  it("updates a seed", async () => {
    const id = await dao.add(makeSeed());
    await dao.update(id, { plant: "Kale", notes: "Updated" });

    const updated = await dao.getById(id);
    expect(updated!.plant).toBe("Kale");
    expect(updated!.notes).toBe("Updated");
    expect(updated!.varietal).toBe("Forellenschluss");
  });

  it("deletes a seed", async () => {
    const id = await dao.add(makeSeed());
    expect(await dao.count()).toBe(1);

    await dao.delete(id);
    expect(await dao.count()).toBe(0);

    const deleted = await dao.getById(id);
    expect(deleted).toBeUndefined();
  });

  it("returns undefined for non-existent seed", async () => {
    const result = await dao.getById(999);
    expect(result).toBeUndefined();
  });

  it("preserves all fields", async () => {
    const id = await dao.add(makeSeed());
    const seed = await dao.getById(id);

    expect(seed!.seedOrStart).toBe("Seed");
    expect(seed!.purchased).toBe(true);
    expect(seed!.coldSowStart).toBe("2026-02-20");
    expect(seed!.coldSowEnd).toBe("2026-03-10");
    expect(seed!.directSowStart).toBe("2026-04-01");
    expect(seed!.directSowEnd).toBe("2026-05-15");
    expect(seed!.soilTempMin).toBe(40);
    expect(seed!.soilTempMax).toBe(75);
  });

  it("update returns 1 on success, 0 on non-existent", async () => {
    const id = await dao.add(makeSeed());
    const updated = await dao.update(id, { plant: "Kale" });
    expect(updated).toBe(1);

    const notFound = await dao.update(999, { plant: "Ghost" });
    expect(notFound).toBe(0);
  });

  it("queries by plant name index", async () => {
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", varietal: "Butter" }),
      makeSeed({ plant: "Tomato", varietal: "Roma" }),
      makeSeed({ plant: "Lettuce", varietal: "Romaine" }),
    ]);

    const lettuces = await dao.queryByPlant("Lettuce");
    expect(lettuces).toHaveLength(2);
  });
});
