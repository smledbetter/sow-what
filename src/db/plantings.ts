import type { Planting, SowMethod } from "../types/index.ts";
import { db as defaultDb, type SowWhatDB } from "./database.ts";

export function createPlantingDAO(db: SowWhatDB = defaultDb) {
  return {
    getAll(): Promise<Planting[]> {
      return db.plantings.toArray();
    },

    getById(id: number): Promise<Planting | undefined> {
      return db.plantings.get(id);
    },

    add(planting: Omit<Planting, "id">): Promise<number> {
      return db.plantings.add(planting);
    },

    bulkAdd(plantings: Omit<Planting, "id">[]): Promise<number> {
      return db.plantings.bulkAdd(plantings) as Promise<number>;
    },

    update(id: number, changes: Partial<Omit<Planting, "id">>): Promise<number> {
      return db.plantings.update(id, changes);
    },

    delete(id: number): Promise<void> {
      return db.plantings.delete(id);
    },

    getByMethod(method: SowMethod): Promise<Planting[]> {
      return db.plantings.where("method").equals(method).toArray();
    },

    getBySeedId(seedId: number): Promise<Planting[]> {
      return db.plantings.where("seedId").equals(seedId).toArray();
    },
  };
}

export const plantingDAO = createPlantingDAO();
