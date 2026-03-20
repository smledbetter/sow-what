/** Planting flow: create/remove planting records with weather snapshots. */

import type { SowMethod } from "../types/index.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createWeatherDAO } from "../db/weather.ts";
import type { SowWhatDB } from "../db/database.ts";

/** Stub weather snapshot for now. Will be replaced with Open-Meteo in Sprint 6. */
function stubWeatherSnapshot(date: string) {
  return {
    date,
    tempHigh: 0,
    tempLow: 0,
    precipitation: 0,
    conditions: "Not recorded",
    rawJson: "{}",
  };
}

export interface CreatePlantingResult {
  plantingId: number;
  weatherSnapshotId: number;
}

/**
 * Create a planting record with an associated weather snapshot.
 * Returns both IDs for tracking.
 */
export async function createPlantingRecord(
  seedId: number,
  method: SowMethod,
  datePlanted: string,
  db?: SowWhatDB,
): Promise<CreatePlantingResult> {
  const weatherDAO = db ? createWeatherDAO(db) : createWeatherDAO();
  const plantingDAO = db ? createPlantingDAO(db) : createPlantingDAO();

  const weatherSnapshotId = await weatherDAO.add(stubWeatherSnapshot(datePlanted));

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
