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
  }
}

export const db = new SowWhatDB();
