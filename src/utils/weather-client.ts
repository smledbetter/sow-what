/** Open-Meteo weather client with Dexie caching for offline use. */

import { createWeatherDAO } from "../db/weather.ts";
import type { SowWhatDB } from "../db/database.ts";

/** WMO Weather Code → human-readable description */
const WMO_CODES: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

export function weatherCodeToDescription(code: number): string {
  return WMO_CODES[code] ?? `Unknown (${code})`;
}

/** CT coordinates (hardcoded for now — settings can override later) */
const DEFAULT_LAT = 41.76;
const DEFAULT_LON = -72.68;

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

/** Shape of the Open-Meteo API response we request */
export interface OpenMeteoResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
  };
}

export interface CurrentConditions {
  temperature: number;
  feelsLike: number;
  precipitation: number;
  weatherCode: number;
  description: string;
  windSpeed: number;
  time: string;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  weatherCode: number;
  description: string;
  hasFrostWarning: boolean;
}

export interface WeatherData {
  current: CurrentConditions;
  forecast: ForecastDay[];
  fromCache: boolean;
}

/** Frost threshold in Fahrenheit */
export const FROST_THRESHOLD_F = 32;

/**
 * Build the Open-Meteo URL for current conditions + 7-day forecast.
 * Exported for testing.
 */
export function buildWeatherUrl(
  lat: number = DEFAULT_LAT,
  lon: number = DEFAULT_LON,
): string {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
    daily:
      "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    temperature_unit: "fahrenheit",
    precipitation_unit: "inch",
    timezone: "America/New_York",
    forecast_days: "7",
  });
  return `${BASE_URL}?${params.toString()}`;
}

/** Parse the Open-Meteo JSON response into our domain types. */
export function parseWeatherResponse(data: OpenMeteoResponse): WeatherData {
  const current: CurrentConditions = {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    precipitation: data.current.precipitation,
    weatherCode: data.current.weather_code,
    description: weatherCodeToDescription(data.current.weather_code),
    windSpeed: data.current.wind_speed_10m,
    time: data.current.time,
  };

  const forecast: ForecastDay[] = data.daily.time.map((date, i) => ({
    date,
    tempMax: data.daily.temperature_2m_max[i],
    tempMin: data.daily.temperature_2m_min[i],
    precipitation: data.daily.precipitation_sum[i],
    weatherCode: data.daily.weather_code[i],
    description: weatherCodeToDescription(data.daily.weather_code[i]),
    hasFrostWarning: data.daily.temperature_2m_min[i] <= FROST_THRESHOLD_F,
  }));

  return { current, forecast, fromCache: false };
}

/** Cache key for storing serialized WeatherData in Dexie */
const CACHE_DATE_KEY = "__weather_cache";

/**
 * Save weather data to Dexie cache as a WeatherSnapshot.
 * Uses a special date key so we can retrieve it easily.
 */
export async function cacheWeatherData(
  weatherData: WeatherData,
  db?: SowWhatDB,
): Promise<void> {
  const dao = db ? createWeatherDAO(db) : createWeatherDAO();
  // Remove old cache entry if exists
  const existing = await dao.getByDate(CACHE_DATE_KEY);
  if (existing?.id !== undefined) {
    await dao.delete(existing.id);
  }
  await dao.add({
    date: CACHE_DATE_KEY,
    tempHigh: weatherData.current.temperature,
    tempLow: weatherData.current.feelsLike,
    precipitation: weatherData.current.precipitation,
    conditions: weatherData.current.description,
    rawJson: JSON.stringify(weatherData),
  });
}

/**
 * Load cached weather data from Dexie.
 * Returns null if no cache exists.
 */
export async function loadCachedWeatherData(
  db?: SowWhatDB,
): Promise<WeatherData | null> {
  const dao = db ? createWeatherDAO(db) : createWeatherDAO();
  const cached = await dao.getByDate(CACHE_DATE_KEY);
  if (!cached) return null;
  try {
    const data = JSON.parse(cached.rawJson) as WeatherData;
    return { ...data, fromCache: true };
  } catch {
    return null;
  }
}

/**
 * Fetch weather from Open-Meteo, cache it, and return.
 * On failure, falls back to cached data.
 * fetchFn is injectable for testing (defaults to global fetch).
 */
export async function fetchWeather(options?: {
  db?: SowWhatDB;
  fetchFn?: typeof fetch;
  lat?: number;
  lon?: number;
}): Promise<WeatherData | null> {
  const { db, fetchFn = fetch, lat, lon } = options ?? {};
  const url = buildWeatherUrl(lat, lon);

  try {
    const response = await fetchFn(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = (await response.json()) as OpenMeteoResponse;
    const weatherData = parseWeatherResponse(json);
    // Cache for offline use (best-effort — don't let cache failure break the flow)
    try {
      await cacheWeatherData(weatherData, db);
    } catch {
      // Cache write failed — continue with live data
    }
    return weatherData;
  } catch {
    // Network failure — try cache
    return loadCachedWeatherData(db);
  }
}

/**
 * Fetch current weather snapshot for a planting record.
 * Returns weather data suitable for storing in a WeatherSnapshot.
 * Falls back to stub data if fetch fails and no cache exists.
 */
export async function fetchWeatherForPlanting(
  date: string,
  options?: { db?: SowWhatDB; fetchFn?: typeof fetch },
): Promise<{
  date: string;
  tempHigh: number;
  tempLow: number;
  precipitation: number;
  conditions: string;
  rawJson: string;
}> {
  const weatherData = await fetchWeather(options);
  if (weatherData) {
    // Find today's forecast day, or use current conditions
    const todayForecast = weatherData.forecast.find((d) => d.date === date);
    return {
      date,
      tempHigh: todayForecast?.tempMax ?? Math.round(weatherData.current.temperature),
      tempLow: todayForecast?.tempMin ?? Math.round(weatherData.current.feelsLike),
      precipitation: todayForecast?.precipitation ?? weatherData.current.precipitation,
      conditions: todayForecast?.description ?? weatherData.current.description,
      rawJson: JSON.stringify(weatherData),
    };
  }
  // Complete failure — return stub
  return {
    date,
    tempHigh: 0,
    tempLow: 0,
    precipitation: 0,
    conditions: "Not recorded",
    rawJson: "{}",
  };
}
