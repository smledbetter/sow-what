/** Planting flow: create/remove planting records with weather snapshots. */

import type { SowMethod } from "../types/index.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createWeatherDAO } from "../db/weather.ts";
import type { SowWhatDB } from "../db/database.ts";
import { fetchWeatherForPlanting } from "./weather-client.ts";

export interface CreatePlantingResult {
  plantingId: number;
  weatherSnapshotId: number;
}

/**
 * Create a planting record with an associated weather snapshot.
 * Fetches real weather from Open-Meteo; falls back to stub data if offline.
 * fetchFn is injectable for testing (defaults to global fetch).
 */
export async function createPlantingRecord(
  seedId: number,
  method: SowMethod,
  datePlanted: string,
  db?: SowWhatDB,
  fetchFn?: typeof fetch,
): Promise<CreatePlantingResult> {
  const weatherDAO = db ? createWeatherDAO(db) : createWeatherDAO();
  const plantingDAO = db ? createPlantingDAO(db) : createPlantingDAO();

  const weatherSnapshot = await fetchWeatherForPlanting(datePlanted, { db, fetchFn });
  const weatherSnapshotId = await weatherDAO.add(weatherSnapshot);

  const plantingId = await plantingDAO.add({
    seedId,
    method,
    datePlanted,
    bedLocation: "",
    germinationDate: "",
    expectedHarvest: "",
    weatherSnapshotId,
  });

  return { plantingId, weatherSnapshotId };
}

/**
 * Remove a planting record and its associated weather snapshot.
 */
export async function removePlantingRecord(
  plantingId: number,
  db?: SowWhatDB,
): Promise<void> {
  const plantingDAO = db ? createPlantingDAO(db) : createPlantingDAO();
  const weatherDAO = db ? createWeatherDAO(db) : createWeatherDAO();

  const planting = await plantingDAO.getById(plantingId);
  if (planting) {
    await weatherDAO.delete(planting.weatherSnapshotId);
    await plantingDAO.delete(plantingId);
  }
}

/**
 * Find a planting for a given seedId and method on a specific date.
 * Used to check if a seed has already been planted today.
 */
export async function findPlantingForSeed(
  seedId: number,
  method: SowMethod,
  datePlanted: string,
  db?: SowWhatDB,
): Promise<number | undefined> {
  const plantingDAO = db ? createPlantingDAO(db) : createPlantingDAO();
  const plantings = await plantingDAO.getBySeedId(seedId);
  const match = plantings.find(
    (p) => p.method === method && p.datePlanted === datePlanted,
  );
  return match?.id;
}
