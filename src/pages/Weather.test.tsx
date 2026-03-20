import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { Weather } from "./Weather.tsx";
import type { OpenMeteoResponse } from "../utils/weather-client.ts";
import { cacheWeatherData, parseWeatherResponse } from "../utils/weather-client.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

beforeEach(async () => {
  dbName = `test-weather-page-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

function makeMockResponse(overrides?: Partial<OpenMeteoResponse>): OpenMeteoResponse {
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

function renderWeather(props: { db?: SowWhatDB; fetchFn?: typeof fetch } = {}) {
  const routes = [
    { path: "/weather", element: <Weather {...props} /> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: ["/weather"] });
  return render(<RouterProvider router={router} />);
}

describe("Weather page", () => {
  it("renders heading", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });
    expect(screen.getByRole("heading", { name: "Weather" })).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    // Use a fetch that never resolves
    const fetchFn = vi.fn().mockReturnValue(new Promise(() => {}));
    renderWeather({ db, fetchFn });
    expect(screen.getByText("Loading weather...")).toBeInTheDocument();
  });

  it("displays current conditions after fetch", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText("Current Conditions")).toBeInTheDocument();
    });
    expect(screen.getByText(/45.*F/)).toBeInTheDocument();
    // "Partly cloudy" appears in both current conditions and first forecast card
    expect(screen.getAllByText("Partly cloudy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Feels like 40.*F/)).toBeInTheDocument();
    expect(screen.getByText(/Wind: 8.5 km/)).toBeInTheDocument();
  });

  it("displays 7-day forecast", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText("7-Day Forecast")).toBeInTheDocument();
    });

    const forecastList = screen.getByRole("list", { name: "Forecast" });
    expect(forecastList).toBeInTheDocument();
    // 3 forecast days in our mock
    const items = forecastList.querySelectorAll("li");
    expect(items).toHaveLength(3);
  });

  it("shows frost warning for days with low <= 32F", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText("Frost Alerts")).toBeInTheDocument();
    });
    // Day 2 (2026-03-21) has min 30F — frost
    expect(screen.getByText(/1 day with frost risk/)).toBeInTheDocument();
    expect(screen.getByText(/Frost warning: low of 30/)).toBeInTheDocument();
  });

  it("shows no frost alerts when all temps above 32F", async () => {
    const noFrostResponse = makeMockResponse({
      daily: {
        time: ["2026-03-20", "2026-03-21"],
        temperature_2m_max: [55.0, 60.0],
        temperature_2m_min: [40.0, 45.0],
        precipitation_sum: [0.0, 0.0],
        weather_code: [0, 0],
      },
    });
    const fetchFn = mockFetchOk(noFrostResponse);
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText("7-Day Forecast")).toBeInTheDocument();
    });
    expect(screen.queryByText("Frost Alerts")).not.toBeInTheDocument();
  });

  it("shows error state when fetch fails and no cache", async () => {
    const fetchFn = mockFetchFail();
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText(/Unable to load weather data/)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("retry button triggers new fetch", async () => {
    const user = userEvent.setup();
    let callCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount <= 1) return Promise.reject(new Error("fail"));
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(makeMockResponse()),
      });
    });
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText(/Unable to load weather data/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText("Current Conditions")).toBeInTheDocument();
    });
  });

  it("shows cached data indicator when from cache", async () => {
    // Pre-populate cache
    await cacheWeatherData(parseWeatherResponse(makeMockResponse()), db);

    const fetchFn = mockFetchFail();
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText(/Showing cached data/)).toBeInTheDocument();
    });
    expect(screen.getByText("Current Conditions")).toBeInTheDocument();
  });

  it("shows precipitation in forecast when > 0", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText("7-Day Forecast")).toBeInTheDocument();
    });
    // Day 2 has 0.1" precipitation
    expect(screen.getByText(/0\.10" rain/)).toBeInTheDocument();
  });

  it("displays current precipitation when > 0", async () => {
    const wetResponse = makeMockResponse({
      current: {
        time: "2026-03-20T07:00",
        temperature_2m: 50.0,
        apparent_temperature: 45.0,
        precipitation: 0.25,
        weather_code: 61,
        wind_speed_10m: 10.0,
      },
    });
    const fetchFn = mockFetchOk(wetResponse);
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText(/Precipitation: 0.25/)).toBeInTheDocument();
    });
  });

  it("has accessible section headings", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText("Current Conditions")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Weather", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Current Conditions", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "7-Day Forecast", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frost Alerts", level: 2 })).toBeInTheDocument();
  });

  it("frost alert has alert role", async () => {
    const fetchFn = mockFetchOk(makeMockResponse());
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("retry shows error when retry also fails", async () => {
    const user = userEvent.setup();
    const fetchFn = vi.fn().mockRejectedValue(new Error("fail"));
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText(/Unable to load weather data/)).toBeInTheDocument();
    });

    // Click retry — still fails
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByText(/Unable to load weather data/)).toBeInTheDocument();
    });
    // Fetch was called for initial load + retry
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("shows multiple frost days", async () => {
    const multiFrostResponse = makeMockResponse({
      daily: {
        time: ["2026-03-20", "2026-03-21", "2026-03-22"],
        temperature_2m_max: [40.0, 35.0, 50.0],
        temperature_2m_min: [28.0, 25.0, 38.0],
        precipitation_sum: [0.0, 0.0, 0.0],
        weather_code: [0, 0, 0],
      },
    });
    const fetchFn = mockFetchOk(multiFrostResponse);
    renderWeather({ db, fetchFn });

    await waitFor(() => {
      expect(screen.getByText(/2 days with frost risk/)).toBeInTheDocument();
    });
  });
});
