import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import {
  weatherCodeToDescription,
  buildWeatherUrl,
  parseWeatherResponse,
  cacheWeatherData,
  loadCachedWeatherData,
  fetchWeather,
  fetchWeatherForPlanting,
  FROST_THRESHOLD_F,
} from "./weather-client.ts";
import type { OpenMeteoResponse, WeatherData } from "./weather-client.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

beforeEach(async () => {
  dbName = `test-weather-client-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

/** Factory for a realistic Open-Meteo response */
function makeMockResponse(
  overrides?: Partial<OpenMeteoResponse>,
): OpenMeteoResponse {
  return {
    current: {
      time: "2026-03-20T07:00",
      temperature_2m: 45.0,
      apparent_temperature: 40.0,
      precipitation: 0.0,
      weather_code: 2,
      wind_speed_10m: 8.5,
      ...(overrides?.current ?? {}),
    },
    daily: {
      time: ["2026-03-20", "2026-03-21", "2026-03-22"],
      temperature_2m_max: [52.0, 48.0, 55.0],
      temperature_2m_min: [35.0, 30.0, 38.0],
      precipitation_sum: [0.0, 0.1, 0.0],
      weather_code: [2, 61, 0],
      ...(overrides?.daily ?? {}),
    },
  };
}

function mockFetchOk(data: OpenMeteoResponse): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchFail(): typeof fetch {
  return vi.fn().mockRejectedValue(new Error("Network error"));
}

function mockFetchHttpError(status: number): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

describe("weatherCodeToDescription", () => {
  it("maps known WMO codes", () => {
    expect(weatherCodeToDescription(0)).toBe("Clear sky");
    expect(weatherCodeToDescription(61)).toBe("Slight rain");
    expect(weatherCodeToDescription(95)).toBe("Thunderstorm");
  });

  it("returns Unknown for unrecognized codes", () => {
    expect(weatherCodeToDescription(999)).toBe("Unknown (999)");
  });
});

describe("buildWeatherUrl", () => {
  it("builds URL with default CT coordinates", () => {
    const url = buildWeatherUrl();
    expect(url).toContain("latitude=41.76");
    expect(url).toContain("longitude=-72.68");
    expect(url).toContain("temperature_unit=fahrenheit");
    expect(url).toContain("forecast_days=7");
  });

  it("accepts custom coordinates", () => {
    const url = buildWeatherUrl(40.7, -74.0);
    expect(url).toContain("latitude=40.7");
    expect(url).toContain("longitude=-74");
  });
});

describe("parseWeatherResponse", () => {
  it("parses current conditions", () => {
    const data = makeMockResponse();
    const result = parseWeatherResponse(data);

    expect(result.current.temperature).toBe(45.0);
    expect(result.current.feelsLike).toBe(40.0);
    expect(result.current.precipitation).toBe(0.0);
    expect(result.current.weatherCode).toBe(2);
    expect(result.current.description).toBe("Partly cloudy");
    expect(result.current.windSpeed).toBe(8.5);
    expect(result.current.time).toBe("2026-03-20T07:00");
  });

  it("parses forecast days", () => {
    const data = makeMockResponse();
    const result = parseWeatherResponse(data);

    expect(result.forecast).toHaveLength(3);
    expect(result.forecast[0].date).toBe("2026-03-20");
    expect(result.forecast[0].tempMax).toBe(52.0);
    expect(result.forecast[0].tempMin).toBe(35.0);
    expect(result.forecast[0].description).toBe("Partly cloudy");
  });

  it("marks frost warnings when min temp <= 32F", () => {
    const data = makeMockResponse();
    const result = parseWeatherResponse(data);

    // Day 0: min 35 — no frost
    expect(result.forecast[0].hasFrostWarning).toBe(false);
    // Day 1: min 30 — frost!
    expect(result.forecast[1].hasFrostWarning).toBe(true);
    // Day 2: min 38 — no frost
    expect(result.forecast[2].hasFrostWarning).toBe(false);
  });

  it("marks exactly 32F as frost warning", () => {
    const data = makeMockResponse({
      daily: {
        time: ["2026-03-20"],
        temperature_2m_max: [50.0],
        temperature_2m_min: [32.0],
        precipitation_sum: [0.0],
        weather_code: [0],
      },
    });
    const result = parseWeatherResponse(data);
    expect(result.forecast[0].hasFrostWarning).toBe(true);
  });

  it("sets fromCache to false for fresh data", () => {
    const result = parseWeatherResponse(makeMockResponse());
    expect(result.fromCache).toBe(false);
  });
});

describe("FROST_THRESHOLD_F", () => {
  it("is 32", () => {
    expect(FROST_THRESHOLD_F).toBe(32);
  });
});

describe("cacheWeatherData + loadCachedWeatherData", () => {
  it("round-trips weather data through Dexie", async () => {
    const weatherData: WeatherData = {
      ...parseWeatherResponse(makeMockResponse()),
      fromCache: false,
    };

    await cacheWeatherData(weatherData, db);
    const loaded = await loadCachedWeatherData(db);

    expect(loaded).not.toBeNull();
    expect(loaded!.fromCache).toBe(true);
    expect(loaded!.current.temperature).toBe(45.0);
    expect(loaded!.forecast).toHaveLength(3);
  });

  it("returns null when no cache exists", async () => {
    const loaded = await loadCachedWeatherData(db);
    expect(loaded).toBeNull();
  });

  it("overwrites old cache on re-cache", async () => {
    const data1 = parseWeatherResponse(makeMockResponse());
    await cacheWeatherData(data1, db);

    const data2 = parseWeatherResponse(
      makeMockResponse({
        current: {
          time: "2026-03-21T07:00",
          temperature_2m: 60.0,
          apparent_temperature: 55.0,
          precipitation: 0.0,
          weather_code: 0,
          wind_speed_10m: 5.0,
        },
      }),
    );
    await cacheWeatherData(data2, db);

    const loaded = await loadCachedWeatherData(db);
    expect(loaded!.current.temperature).toBe(60.0);

    // Only one cache entry
    const all = await db.weatherSnapshots.where("date").equals("__weather_cache").toArray();
    expect(all).toHaveLength(1);
  });

  it("returns null for corrupted cache", async () => {
    // Write garbage rawJson
    const dao = (await import("../db/weather.ts")).createWeatherDAO(db);
    await dao.add({
      date: "__weather_cache",
      tempHigh: 0,
      tempLow: 0,
      precipitation: 0,
      conditions: "",
      rawJson: "not json!!!",
    });

    const loaded = await loadCachedWeatherData(db);
    expect(loaded).toBeNull();
  });
});

describe("fetchWeather", () => {
  it("fetches and returns parsed weather data", async () => {
    const mockResponse = makeMockResponse();
    const fetchFn = mockFetchOk(mockResponse);

    const result = await fetchWeather({ db, fetchFn });

    expect(result).not.toBeNull();
    expect(result!.current.temperature).toBe(45.0);
    expect(result!.forecast).toHaveLength(3);
    expect(result!.fromCache).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("caches data on successful fetch", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    await fetchWeather({ db, fetchFn });

    const cached = await loadCachedWeatherData(db);
    expect(cached).not.toBeNull();
    expect(cached!.current.temperature).toBe(45.0);
  });

  it("falls back to cache on network error", async () => {
    // Pre-populate cache
    await cacheWeatherData(parseWeatherResponse(makeMockResponse()), db);

    const fetchFn = mockFetchFail();
    const result = await fetchWeather({ db, fetchFn });

    expect(result).not.toBeNull();
    expect(result!.fromCache).toBe(true);
    expect(result!.current.temperature).toBe(45.0);
  });

  it("falls back to cache on HTTP error", async () => {
    await cacheWeatherData(parseWeatherResponse(makeMockResponse()), db);

    const fetchFn = mockFetchHttpError(500);
    const result = await fetchWeather({ db, fetchFn });

    expect(result).not.toBeNull();
    expect(result!.fromCache).toBe(true);
  });

  it("returns null when fetch fails and no cache exists", async () => {
    const fetchFn = mockFetchFail();
    const result = await fetchWeather({ db, fetchFn });
    expect(result).toBeNull();
  });

  it("passes custom coordinates to URL", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    await fetchWeather({ db, fetchFn, lat: 40.7, lon: -74.0 });

    const calledUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toContain("latitude=40.7");
    expect(calledUrl).toContain("longitude=-74");
  });
});

describe("fetchWeatherForPlanting", () => {
  it("returns today's forecast data when available", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    const result = await fetchWeatherForPlanting("2026-03-20", { db, fetchFn });

    expect(result.date).toBe("2026-03-20");
    expect(result.tempHigh).toBe(52.0);
    expect(result.tempLow).toBe(35.0);
    expect(result.conditions).toBe("Partly cloudy");
    expect(result.rawJson).toContain("temperature");
  });

  it("falls back to current conditions for unknown date", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    const result = await fetchWeatherForPlanting("2026-04-01", { db, fetchFn });

    expect(result.date).toBe("2026-04-01");
    expect(result.tempHigh).toBe(Math.round(45.0));
    expect(result.tempLow).toBe(Math.round(40.0));
    expect(result.conditions).toBe("Partly cloudy");
  });

  it("returns stub data when fetch fails and no cache", async () => {
    const fetchFn = mockFetchFail();
    const result = await fetchWeatherForPlanting("2026-03-20", { db, fetchFn });

    expect(result.date).toBe("2026-03-20");
    expect(result.tempHigh).toBe(0);
    expect(result.tempLow).toBe(0);
    expect(result.conditions).toBe("Not recorded");
    expect(result.rawJson).toBe("{}");
  });

  it("uses cached data when fetch fails", async () => {
    // Pre-populate cache
    await cacheWeatherData(parseWeatherResponse(makeMockResponse()), db);

    const fetchFn = mockFetchFail();
    const result = await fetchWeatherForPlanting("2026-03-21", { db, fetchFn });

    expect(result.date).toBe("2026-03-21");
    expect(result.tempHigh).toBe(48.0);
    expect(result.tempLow).toBe(30.0);
    expect(result.conditions).toBe("Slight rain");
  });
});
