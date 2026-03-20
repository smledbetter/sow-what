import type { ForecastDay } from "./weather-client.ts";

export interface PlantingWarning {
  icon: string;
  label: string;
  days: string[];
}

/** Check forecast for conditions that contraindicate planting */
export function getPlantingWarnings(forecast: ForecastDay[]): PlantingWarning[] {
  const warnings: PlantingWarning[] = [];

  const frostDays = forecast.filter((d) => d.tempMin <= 32);
  if (frostDays.length > 0) {
    warnings.push({
      icon: "\u2744\uFE0F",
      label: "Frost",
      days: frostDays.map((d) => d.date),
    });
  }

  const heavyRainDays = forecast.filter((d) => d.precipitation >= 1.0);
  if (heavyRainDays.length > 0) {
    warnings.push({
      icon: "\uD83C\uDF27\uFE0F",
      label: "Heavy rain",
      days: heavyRainDays.map((d) => d.date),
    });
  }

  const heatDays = forecast.filter((d) => d.tempMax >= 95);
  if (heatDays.length > 0) {
    warnings.push({
      icon: "\uD83D\uDD25",
      label: "Extreme heat",
      days: heatDays.map((d) => d.date),
    });
  }

  // WMO codes: 95 = thunderstorm, 96/99 = thunderstorm with hail
  // Wind info isn't in daily forecast, but severe storm codes imply it
  const stormDays = forecast.filter(
    (d) => d.weatherCode >= 95 || d.weatherCode === 82,
  );
  if (stormDays.length > 0) {
    // Avoid duplicating if already covered by heavy rain
    const stormOnly = stormDays.filter(
      (d) => !heavyRainDays.some((r) => r.date === d.date),
    );
    if (stormOnly.length > 0) {
      warnings.push({
        icon: "\u26A1",
        label: "Severe storms",
        days: stormOnly.map((d) => d.date),
      });
    }
  }

  return warnings;
}

/** Format a date like "Thu" or "Today" */
export function shortDayLabel(dateStr: string, todayStr: string): string {
  if (dateStr === todayStr) return "Today";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
