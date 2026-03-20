import { useState, useEffect, useCallback } from "react";
import { BottomNav } from "../components/BottomNav.tsx";
import type { SowWhatDB } from "../db/database.ts";
import type { WeatherData, ForecastDay } from "../utils/weather-client.ts";
import { fetchWeather, FROST_THRESHOLD_F } from "../utils/weather-client.ts";

export interface WeatherProps {
  db?: SowWhatDB;
  /** Injectable fetch for testing — never hit Open-Meteo in tests */
  fetchFn?: typeof fetch;
}

function formatDayName(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function ForecastCard({ day }: { day: ForecastDay }) {
  const isFrost = day.hasFrostWarning;

  return (
    <li
      style={{
        padding: "12px",
        borderBottom: "1px solid var(--color-border, #d0d0d0)",
        backgroundColor: isFrost ? "#fff3e0" : "transparent",
        borderLeft: isFrost ? "4px solid var(--color-danger, #c62828)" : "4px solid transparent",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        minHeight: "44px",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: "bold", fontSize: "16px", color: "var(--color-text, #1a1a1a)" }}>
          {formatDayName(day.date)}
        </div>
        <div style={{ fontSize: "14px", color: "var(--color-text-secondary, #525252)" }}>
          {day.description}
        </div>
        {isFrost && (
          <div
            style={{
              fontSize: "13px",
              color: "var(--color-danger, #c62828)",
              fontWeight: "bold",
              marginTop: "2px",
            }}
            role="status"
          >
            Frost warning: low of {Math.round(day.tempMin)}&deg;F
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
        <div style={{ fontSize: "16px", fontWeight: "bold", color: "var(--color-text, #1a1a1a)" }}>
          {Math.round(day.tempMax)}&deg;
        </div>
        <div style={{ fontSize: "14px", color: "var(--color-text-secondary, #525252)" }}>
          {Math.round(day.tempMin)}&deg;
        </div>
        {day.precipitation > 0 && (
          <div style={{ fontSize: "12px", color: "var(--color-text-hint, #6b6b6b)" }}>
            {day.precipitation.toFixed(2)}&quot; rain
          </div>
        )}
      </div>
    </li>
  );
}

export function Weather({ db, fetchFn }: WeatherProps = {}) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await fetchWeather({ db, fetchFn });
    if (data) {
      setWeather(data);
    } else {
      setError("Unable to load weather data. Check your connection and try again.");
    }
    setLoading(false);
  }, [db, fetchFn]);

  useEffect(() => {
    let cancelled = false;
    fetchWeather({ db, fetchFn }).then((data) => {
      if (cancelled) return;
      if (data) {
        setWeather(data);
      } else {
        setError("Unable to load weather data. Check your connection and try again.");
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [db, fetchFn]);

  const frostDays = weather?.forecast.filter((d) => d.hasFrostWarning) ?? [];

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <h1 style={{ margin: "0 0 16px 0", fontSize: "24px" }}>Weather</h1>

      {loading && (
        <p style={{ color: "var(--color-text-secondary, #525252)", textAlign: "center", padding: "32px 0" }}>
          Loading weather...
        </p>
      )}

      {error && !weather && (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ color: "var(--color-danger, #c62828)", fontSize: "16px" }}>
            {error}
          </p>
          <button
            onClick={() => { void loadWeather(); }}
            style={{
              marginTop: "12px",
              padding: "12px 24px",
              fontSize: "16px",
              minHeight: "44px",
              cursor: "pointer",
              borderRadius: "8px",
              border: "1px solid var(--color-border, #d0d0d0)",
              backgroundColor: "var(--color-bg, #fff)",
              color: "var(--color-text, #1a1a1a)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {weather && !loading && (
        <>
          {weather.fromCache && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-hint, #6b6b6b)",
                margin: "0 0 12px 0",
                fontStyle: "italic",
              }}
            >
              Showing cached data (offline)
            </p>
          )}

          {/* Current Conditions */}
          <section aria-labelledby="current-heading">
            <h2
              id="current-heading"
              style={{ fontSize: "18px", margin: "0 0 8px 0", color: "var(--color-text, #1a1a1a)" }}
            >
              Current Conditions
            </h2>
            <div
              style={{
                backgroundColor: "var(--color-bg-muted, #f5f5f5)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ fontSize: "36px", fontWeight: "bold", color: "var(--color-text, #1a1a1a)" }}>
                {Math.round(weather.current.temperature)}&deg;F
              </div>
              <div style={{ fontSize: "16px", color: "var(--color-text-secondary, #525252)", marginBottom: "8px" }}>
                {weather.current.description}
              </div>
              <div style={{ fontSize: "14px", color: "var(--color-text-secondary, #525252)" }}>
                Feels like {Math.round(weather.current.feelsLike)}&deg;F
              </div>
              <div style={{ fontSize: "14px", color: "var(--color-text-secondary, #525252)" }}>
                Wind: {weather.current.windSpeed} km/h
              </div>
              {weather.current.precipitation > 0 && (
                <div style={{ fontSize: "14px", color: "var(--color-text-secondary, #525252)" }}>
                  Precipitation: {weather.current.precipitation.toFixed(2)}&quot;
                </div>
              )}
            </div>
          </section>

          {/* Frost Alerts */}
          {frostDays.length > 0 && (
            <section aria-labelledby="frost-heading">
              <h2
                id="frost-heading"
                style={{
                  fontSize: "18px",
                  margin: "0 0 8px 0",
                  color: "var(--color-danger, #c62828)",
                }}
              >
                Frost Alerts
              </h2>
              <div
                style={{
                  backgroundColor: "#fff3e0",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  borderLeft: "4px solid var(--color-danger, #c62828)",
                }}
                role="alert"
              >
                <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "var(--color-danger, #c62828)", fontSize: "14px" }}>
                  {frostDays.length} {frostDays.length === 1 ? "day" : "days"} with frost risk (low &le; {FROST_THRESHOLD_F}&deg;F)
                </p>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary, #525252)" }}>
                  {frostDays.map((d) => formatDayName(d.date)).join(", ")}
                </p>
              </div>
            </section>
          )}

          {/* 7-Day Forecast */}
          <section aria-labelledby="forecast-heading">
            <h2
              id="forecast-heading"
              style={{ fontSize: "18px", margin: "0 0 8px 0", color: "var(--color-text, #1a1a1a)" }}
            >
              7-Day Forecast
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                borderRadius: "8px",
                border: "1px solid var(--color-border, #d0d0d0)",
                overflow: "hidden",
              }}
              role="list"
              aria-label="Forecast"
            >
              {weather.forecast.map((day) => (
                <ForecastCard key={day.date} day={day} />
              ))}
            </ul>
          </section>
        </>
      )}

      <BottomNav />
    </div>
  );
}
