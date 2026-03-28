import type { Seed, Planting, WeatherSnapshot, Setting } from "../types/index.ts";
import type { SowWhatDB } from "../db/database.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createWeatherDAO } from "../db/weather.ts";
import { createSettingsDAO } from "../db/settings.ts";

export interface BackupData {
  version: 1;
  exportedAt: string;
  seeds: Seed[];
  plantings: Planting[];
  weatherSnapshots: WeatherSnapshot[];
  settings: Setting[];
}

export async function exportBackup(db: SowWhatDB): Promise<BackupData> {
  const seedDAO = createSeedDAO(db);
  const plantingDAO = createPlantingDAO(db);
  const weatherDAO = createWeatherDAO(db);
  const settingsDAO = createSettingsDAO(db);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    seeds: await seedDAO.getAll(),
    plantings: await plantingDAO.getAll(),
    weatherSnapshots: await weatherDAO.getAll(),
    settings: await settingsDAO.getAll(),
  };
}

export async function importBackup(db: SowWhatDB, data: BackupData): Promise<{ seeds: number; plantings: number; weatherSnapshots: number; settings: number }> {
  // Clear existing data
  await db.seeds.clear();
  await db.plantings.clear();
  await db.weatherSnapshots.clear();
  await db.settings.clear();

  // Import all tables (preserve IDs)
  if (data.seeds.length > 0) await db.seeds.bulkPut(data.seeds);
  if (data.plantings.length > 0) await db.plantings.bulkPut(data.plantings);
  if (data.weatherSnapshots.length > 0) await db.weatherSnapshots.bulkPut(data.weatherSnapshots);
  if (data.settings.length > 0) await db.settings.bulkPut(data.settings);

  return {
    seeds: data.seeds.length,
    plantings: data.plantings.length,
    weatherSnapshots: data.weatherSnapshots.length,
    settings: data.settings.length,
  };
}

export function parseBackupFile(text: string): BackupData {
  const data = JSON.parse(text) as Record<string, unknown>;

  if (data.version !== 1) {
    throw new Error("Unsupported backup version");
  }
  if (!Array.isArray(data.seeds) || !Array.isArray(data.plantings) || !Array.isArray(data.weatherSnapshots) || !Array.isArray(data.settings)) {
    throw new Error("Invalid backup file: missing required tables");
  }

  return data as unknown as BackupData;
}

export function downloadBackup(data: BackupData, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
