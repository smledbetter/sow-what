import type { Seed } from "../types/index.ts";
import { db as defaultDb, type SowWhatDB } from "./database.ts";

export function createSeedDAO(db: SowWhatDB = defaultDb) {
  return {
    getAll(): Promise<Seed[]> {
      return db.seeds.toArray();
    },

    getById(id: number): Promise<Seed | undefined> {
      return db.seeds.get(id);
    },

    add(seed: Omit<Seed, "id">): Promise<number> {
      return db.seeds.add(seed);
    },

    bulkAdd(seeds: Omit<Seed, "id">[]): Promise<number> {
      return db.seeds.bulkAdd(seeds) as Promise<number>;
    },

    update(id: number, changes: Partial<Omit<Seed, "id">>): Promise<number> {
      return db.seeds.update(id, changes);
    },

    delete(id: number): Promise<void> {
      return db.seeds.delete(id);
    },

    count(): Promise<number> {
      return db.seeds.count();
    },

    queryByPlant(plant: string): Promise<Seed[]> {
      return db.seeds.where("plant").equals(plant).toArray();
    },
  };
}

// Default DAO for app use
export const seedDAO = createSeedDAO();
