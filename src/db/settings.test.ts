import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "./database.ts";
import { createSettingsDAO } from "./settings.ts";

let dbCounter = 0;

describe("settings data access", () => {
  let db: SowWhatDB;
  let dbName: string;
  let dao: ReturnType<typeof createSettingsDAO>;

  beforeEach(async () => {
    dbName = `test-settings-${++dbCounter}`;
    db = new SowWhatDB(dbName);
    await db.open();
    dao = createSettingsDAO(db);
  });

  afterEach(async () => {
    db.close();
    await Dexie.delete(dbName);
  });

  it("sets and gets a setting", async () => {
    await dao.set("pin", '"1234"');
    const val = await dao.get("pin");
    expect(val).toBe('"1234"');
  });

  it("returns undefined for non-existent setting", async () => {
    const val = await dao.get("nonexistent");
    expect(val).toBeUndefined();
  });

  it("overwrites existing setting with put", async () => {
    await dao.set("last_frost", '"2026-05-18"');
    await dao.set("last_frost", '"2026-05-20"');
    const val = await dao.get("last_frost");
    expect(val).toBe('"2026-05-20"');
  });

  it("deletes a setting", async () => {
    await dao.set("pin", '"1234"');
    await dao.delete("pin");
    const val = await dao.get("pin");
    expect(val).toBeUndefined();
  });

  it("gets all settings", async () => {
    await dao.set("pin", '"1234"');
    await dao.set("last_frost", '"2026-05-18"');
    await dao.set("first_frost", '"2026-09-30"');
    const all = await dao.getAll();
    expect(all).toHaveLength(3);
  });

  it("stores JSON-encoded values correctly", async () => {
    const frostDates = JSON.stringify({ last: "2026-05-18", first: "2026-09-30" });
    await dao.set("frost_dates", frostDates);
    const val = await dao.get("frost_dates");
    expect(JSON.parse(val!)).toEqual({ last: "2026-05-18", first: "2026-09-30" });
  });
});
