import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import {
  hashPin,
  verifyPin,
  isAuthenticated,
  setAuthenticated,
  ensureDefaultPin,
  attemptLogin,
  changePin,
  getSetting,
  setSetting,
  SETTING_KEYS,
} from "./pin.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

beforeEach(async () => {
  dbName = `test-pin-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
  setAuthenticated(false);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("hashPin", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await hashPin("1701");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("produces consistent hashes for the same input", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("1234");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("5678");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPin", () => {
  it("returns true for matching PIN", async () => {
    const hash = await hashPin("1701");
    expect(await verifyPin("1701", hash)).toBe(true);
  });

  it("returns false for non-matching PIN", async () => {
    const hash = await hashPin("1701");
    expect(await verifyPin("0000", hash)).toBe(false);
  });
});

describe("session state", () => {
  it("starts unauthenticated", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("can be set to authenticated", () => {
    setAuthenticated(true);
    expect(isAuthenticated()).toBe(true);
  });

  it("can be reset to unauthenticated", () => {
    setAuthenticated(true);
    setAuthenticated(false);
    expect(isAuthenticated()).toBe(false);
  });
});

describe("ensureDefaultPin", () => {
  it("auto-sets default PIN hash when none exists", async () => {
    const hash = await ensureDefaultPin(db);
    expect(hash).toHaveLength(64);
    // Verify it matches "1701"
    expect(await verifyPin("1701", hash)).toBe(true);
  });

  it("returns existing hash if PIN already set", async () => {
    const customHash = await hashPin("9999");
    await db.settings.put({ key: SETTING_KEYS.PIN_HASH, value: customHash });
    const returned = await ensureDefaultPin(db);
    expect(returned).toBe(customHash);
  });
});

describe("attemptLogin", () => {
  it("succeeds with default PIN 1701 on first launch", async () => {
    const result = await attemptLogin("1701", db);
    expect(result).toBe(true);
    expect(isAuthenticated()).toBe(true);
  });

  it("fails with wrong PIN on first launch", async () => {
    const result = await attemptLogin("0000", db);
    expect(result).toBe(false);
    expect(isAuthenticated()).toBe(false);
  });

  it("succeeds with correct custom PIN", async () => {
    const hash = await hashPin("4567");
    await db.settings.put({ key: SETTING_KEYS.PIN_HASH, value: hash });
    const result = await attemptLogin("4567", db);
    expect(result).toBe(true);
    expect(isAuthenticated()).toBe(true);
  });

  it("fails with wrong PIN against custom hash", async () => {
    const hash = await hashPin("4567");
    await db.settings.put({ key: SETTING_KEYS.PIN_HASH, value: hash });
    const result = await attemptLogin("1111", db);
    expect(result).toBe(false);
  });
});

describe("changePin", () => {
  it("changes PIN when current PIN is correct", async () => {
    await ensureDefaultPin(db);
    const result = await changePin("1701", "9999", db);
    expect(result).toBe(true);
    // Verify new PIN works
    expect(await attemptLogin("9999", db)).toBe(true);
  });

  it("rejects change when current PIN is wrong", async () => {
    await ensureDefaultPin(db);
    const result = await changePin("0000", "9999", db);
    expect(result).toBe(false);
    // Old PIN still works
    expect(await attemptLogin("1701", db)).toBe(true);
  });

  it("returns false when no PIN is set", async () => {
    const result = await changePin("1701", "9999", db);
    expect(result).toBe(false);
  });
});

describe("getSetting / setSetting", () => {
  it("returns undefined for unset key", async () => {
    const val = await getSetting("nonexistent", db);
    expect(val).toBeUndefined();
  });

  it("stores and retrieves a setting", async () => {
    await setSetting(SETTING_KEYS.LAST_FROST, "05-18", db);
    const val = await getSetting(SETTING_KEYS.LAST_FROST, db);
    expect(val).toBe("05-18");
  });

  it("overwrites existing setting", async () => {
    await setSetting(SETTING_KEYS.SEASON_YEAR, "2025", db);
    await setSetting(SETTING_KEYS.SEASON_YEAR, "2026", db);
    const val = await getSetting(SETTING_KEYS.SEASON_YEAR, db);
    expect(val).toBe("2026");
  });
});
