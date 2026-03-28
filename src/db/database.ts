import Dexie, { type Table } from "dexie";
import type { Seed, Planting, WeatherSnapshot, Setting } from "../types/index.ts";

export class SowWhatDB extends Dexie {
  seeds!: Table<Seed, number>;
  plantings!: Table<Planting, number>;
  weatherSnapshots!: Table<WeatherSnapshot, number>;
  settings!: Table<Setting, string>;

  constructor(name = "SowWhatDB") {
    super(name);

    this.version(1).stores({
      seeds: "++id, plant, varietal",
      plantings: "++id, seedId, method, datePlanted",
      weatherSnapshots: "++id, date",
      settings: "key",
    });

    this.version(2).stores({
      seeds: "++id, plant, varietal",
      plantings: "++id, seedId, method, datePlanted",
      weatherSnapshots: "++id, date",
      settings: "key",
    }).upgrade((tx) => {
      return tx.table("plantings").toCollection().modify((planting) => {
        if (!planting.plantedAt) {
          planting.plantedAt = planting.datePlanted + "T00:00:00.000Z";
        }
      });
    });
  }
}

export const db = new SowWhatDB();
