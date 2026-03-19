import type { Setting } from "../types/index.ts";
import { db as defaultDb, type SowWhatDB } from "./database.ts";

export function createSettingsDAO(db: SowWhatDB = defaultDb) {
  return {
    async get(key: string): Promise<string | undefined> {
      const setting = await db.settings.get(key);
      return setting?.value;
    },

    set(key: string, value: string): Promise<string> {
      return db.settings.put({ key, value });
    },

    delete(key: string): Promise<void> {
      return db.settings.delete(key);
    },

    getAll(): Promise<Setting[]> {
      return db.settings.toArray();
    },
  };
}

export const settingsDAO = createSettingsDAO();
