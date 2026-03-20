/** PIN authentication utilities */

import { createSettingsDAO } from "../db/settings.ts";
import type { SowWhatDB } from "../db/database.ts";

const DEFAULT_PIN = "1701";
const SETTINGS_KEY_PIN = "pin_hash";
const SETTINGS_KEY_LAST_FROST = "last_frost";
const SETTINGS_KEY_FIRST_FROST = "first_frost";
const SETTINGS_KEY_SEASON_YEAR = "season_year";

export const SETTING_KEYS = {
  PIN_HASH: SETTINGS_KEY_PIN,
  LAST_FROST: SETTINGS_KEY_LAST_FROST,
  FIRST_FROST: SETTINGS_KEY_FIRST_FROST,
  SEASON_YEAR: SETTINGS_KEY_SEASON_YEAR,
} as const;

/** Default frost dates for CT */
export const DEFAULT_LAST_FROST = "05-18";
export const DEFAULT_FIRST_FROST = "09-30";

/** Hash a PIN string using SHA-256, returns hex string */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Verify a PIN against a stored hash */
export async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPin(pin);
  return inputHash === storedHash;
}

const SESSION_KEY = "sow_what_auth";

/** Check if user is authenticated (persists within browser session) */
export function isAuthenticated(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

/** Set authentication state (persists within browser session) */
export function setAuthenticated(value: boolean): void {
  if (typeof sessionStorage === "undefined") return;
  if (value) {
    sessionStorage.setItem(SESSION_KEY, "1");
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

/**
 * Ensure a PIN exists in settings. If none is set, auto-set the default PIN (1701).
 * Returns the stored hash.
 */
export async function ensureDefaultPin(db?: SowWhatDB): Promise<string> {
  const dao = db ? createSettingsDAO(db) : createSettingsDAO();
  const existing = await dao.get(SETTINGS_KEY_PIN);
  if (existing) {
    return existing;
  }
  const hash = await hashPin(DEFAULT_PIN);
  await dao.set(SETTINGS_KEY_PIN, hash);
  return hash;
}

/**
 * Attempt to authenticate with a PIN.
 * Returns true if the PIN is correct.
 */
export async function attemptLogin(pin: string, db?: SowWhatDB): Promise<boolean> {
  const dao = db ? createSettingsDAO(db) : createSettingsDAO();
  const storedHash = await dao.get(SETTINGS_KEY_PIN);
  if (!storedHash) {
    // No PIN set — auto-set default and try against that
    const defaultHash = await ensureDefaultPin(db);
    const ok = await verifyPin(pin, defaultHash);
    if (ok) setAuthenticated(true);
    return ok;
  }
  const ok = await verifyPin(pin, storedHash);
  if (ok) setAuthenticated(true);
  return ok;
}

/**
 * Change the PIN. Requires the current PIN to match.
 * Returns true if the change succeeded.
 */
export async function changePin(
  currentPin: string,
  newPin: string,
  db?: SowWhatDB
): Promise<boolean> {
  const dao = db ? createSettingsDAO(db) : createSettingsDAO();
  const storedHash = await dao.get(SETTINGS_KEY_PIN);
  if (!storedHash) return false;

  const currentOk = await verifyPin(currentPin, storedHash);
  if (!currentOk) return false;

  const newHash = await hashPin(newPin);
  await dao.set(SETTINGS_KEY_PIN, newHash);
  return true;
}

/** Get a setting value (for frost dates, season year) */
export async function getSetting(
  key: string,
  db?: SowWhatDB
): Promise<string | undefined> {
  const dao = db ? createSettingsDAO(db) : createSettingsDAO();
  return dao.get(key);
}

/** Set a setting value */
export async function setSetting(
  key: string,
  value: string,
  db?: SowWhatDB
): Promise<void> {
  const dao = db ? createSettingsDAO(db) : createSettingsDAO();
  await dao.set(key, value);
}
