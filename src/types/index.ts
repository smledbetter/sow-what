/** Core data model types for Sow What */

export interface Seed {
  id?: number;
  plant: string;
  varietal: string;
  seedOrStart: "Seed" | "Start";
  purchased: boolean;
  coldSowStart: string; // ISO date YYYY-MM-DD
  coldSowEnd: string;
  directSowStart: string;
  directSowEnd: string;
  soilTempMin: number; // Degrees F
  soilTempMax: number;
  notes: string;
}

export interface Planting {
  id?: number;
  seedId: number;
  method: "cold_sow" | "direct_sow";
  datePlanted: string; // ISO date YYYY-MM-DD
  bedLocation: string;
  germinationDate: string;
  expectedHarvest: string;
  weatherSnapshotId: number;
}

export interface WeatherSnapshot {
  id?: number;
  date: string; // ISO date YYYY-MM-DD
  tempHigh: number; // Degrees F
  tempLow: number;
  precipitation: number; // Inches
  conditions: string;
  rawJson: string;
}

export interface Setting {
  key: string;
  value: string; // JSON-encoded
}

export type SowMethod = "cold_sow" | "direct_sow";
export type SeedOrStart = "Seed" | "Start";
