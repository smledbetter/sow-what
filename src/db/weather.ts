import type { WeatherSnapshot } from "../types/index.ts";
import { db as defaultDb, type SowWhatDB } from "./database.ts";

export function createWeatherDAO(db: SowWhatDB = defaultDb) {
  return {
    getAll(): Promise<WeatherSnapshot[]> {
      return db.weatherSnapshots.toArray();
    },

    getById(id: number): Promise<WeatherSnapshot | undefined> {
      return db.weatherSnapshots.get(id);
    },

    add(snapshot: Omit<WeatherSnapshot, "id">): Promise<number> {
      return db.weatherSnapshots.add(snapshot);
    },

    bulkAdd(snapshots: Omit<WeatherSnapshot, "id">[]): Promise<number> {
      return db.weatherSnapshots.bulkAdd(snapshots) as Promise<number>;
    },

    getByDate(date: string): Promise<WeatherSnapshot | undefined> {
      return db.weatherSnapshots.where("date").equals(date).first();
    },

    delete(id: number): Promise<void> {
      return db.weatherSnapshots.delete(id);
    },
  };
}

export const weatherDAO = createWeatherDAO();
