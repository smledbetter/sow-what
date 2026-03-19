import { describe, it, expect, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "./database.ts";

let dbCounter = 0;
const dbNames: string[] = [];

function makeDb(): SowWhatDB {
  const name = `test-db-${++dbCounter}`;
  dbNames.push(name);
  return new SowWhatDB(name);
}

describe("SowWhatDB", () => {
  afterEach(async () => {
    for (const name of dbNames) {
      await Dexie.delete(name);
    }
    dbNames.length = 0;
  });

  it("creates a database with all four tables", () => {
    const db = makeDb();
    expect(db.seeds).toBeDefined();
    expect(db.plantings).toBeDefined();
    expect(db.weatherSnapshots).toBeDefined();
    expect(db.settings).toBeDefined();
    db.close();
  });

  it("uses custom name when provided", () => {
    const name = `custom-name-${++dbCounter}`;
    dbNames.push(name);
    const db = new SowWhatDB(name);
    expect(db.name).toBe(name);
    db.close();
  });

  it("seeds table has correct indexes", () => {
    const db = makeDb();
    const schema = db.tables.find((t) => t.name === "seeds")?.schema;
    expect(schema).toBeDefined();
    expect(schema!.primKey.auto).toBe(true);
    expect(schema!.primKey.keyPath).toBe("id");
    db.close();
  });

  it("settings table uses key as primary key (not auto-increment)", () => {
    const db = makeDb();
    const schema = db.tables.find((t) => t.name === "settings")?.schema;
    expect(schema).toBeDefined();
    expect(schema!.primKey.auto).toBe(false);
    expect(schema!.primKey.keyPath).toBe("key");
    db.close();
  });
});
