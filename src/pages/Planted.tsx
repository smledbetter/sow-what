import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Planting, Seed, WeatherSnapshot, SowMethod } from "../types/index.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { BottomNav } from "../components/BottomNav.tsx";
import { createWeatherDAO } from "../db/weather.ts";
import type { SowWhatDB } from "../db/database.ts";

export interface PlantedProps {
  db?: SowWhatDB;
}

export type SortField = "datePlanted" | "plant" | "method";
export type FilterMethod = "all" | SowMethod;

interface PlantingRow {
  planting: Planting;
  seed: Seed | undefined;
  weather: WeatherSnapshot | undefined;
}

const methodLabel: Record<string, string> = {
  cold_sow: "Cold Sow",
  direct_sow: "Direct Sow",
};

function formatWeatherInline(weather: WeatherSnapshot | undefined): string {
  if (!weather) return "";
  if (weather.conditions === "Not recorded") return "Weather not recorded";
  return `${weather.conditions}, ${weather.tempHigh}/${weather.tempLow}\u00B0F`;
}

function comparePlantingRows(a: PlantingRow, b: PlantingRow, sortField: SortField): number {
  switch (sortField) {
    case "datePlanted":
      // Newest first
      return b.planting.datePlanted.localeCompare(a.planting.datePlanted);
    case "plant": {
      const aName = a.seed?.plant ?? "";
      const bName = b.seed?.plant ?? "";
      return aName.localeCompare(bName);
    }
    case "method":
      return a.planting.method.localeCompare(b.planting.method);
  }
}

export function Planted({ db }: PlantedProps = {}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PlantingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("datePlanted");
  const [filterMethod, setFilterMethod] = useState<FilterMethod>("all");

  const plantingDAO = useMemo(() => (db ? createPlantingDAO(db) : createPlantingDAO()), [db]);
  const seedDAO = useMemo(() => (db ? createSeedDAO(db) : createSeedDAO()), [db]);
  const weatherDAO = useMemo(() => (db ? createWeatherDAO(db) : createWeatherDAO()), [db]);

  useEffect(() => {
    let cancelled = false;

    plantingDAO.getAll().then(async (plantings) => {
      if (cancelled) return;

      // Load all seeds and weather snapshots in parallel
      const [allSeeds, allWeather] = await Promise.all([
        seedDAO.getAll(),
        weatherDAO.getAll(),
      ]);

      if (cancelled) return;

      const seedMap = new Map<number, Seed>();
      for (const s of allSeeds) {
        if (s.id !== undefined) seedMap.set(s.id, s);
      }

      const weatherMap = new Map<number, WeatherSnapshot>();
      for (const w of allWeather) {
        if (w.id !== undefined) weatherMap.set(w.id, w);
      }

      const plantingRows: PlantingRow[] = plantings.map((p) => ({
        planting: p,
        seed: seedMap.get(p.seedId),
        weather: weatherMap.get(p.weatherSnapshotId),
      }));

      setRows(plantingRows);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [plantingDAO, seedDAO, weatherDAO]);

  const filteredAndSorted = useMemo(() => {
    let result = rows;
    if (filterMethod !== "all") {
      result = result.filter((r) => r.planting.method === filterMethod);
    }
    return [...result].sort((a, b) => comparePlantingRows(a, b, sortField));
  }, [rows, filterMethod, sortField]);

  const sortButtonStyle = (field: SortField): React.CSSProperties => ({
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: sortField === field ? "bold" : "normal",
    backgroundColor: sortField === field ? "#2e7d32" : "#e0e0e0",
    color: sortField === field ? "#fff" : "#333",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    minHeight: "44px",
  });

  const filterButtonStyle = (method: FilterMethod): React.CSSProperties => ({
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: filterMethod === method ? "bold" : "normal",
    backgroundColor: filterMethod === method ? "#2e7d32" : "#e0e0e0",
    color: filterMethod === method ? "#fff" : "#333",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    minHeight: "44px",
  });

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <h1 style={{ margin: "0 0 16px 0", fontSize: "24px" }}>Planted</h1>

      {loading ? (
        <p>Loading...</p>
      ) : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ color: "#6b6b6b", fontSize: "16px" }}>No plantings yet</p>
          <button
            onClick={() => navigate("/")}
            style={{
              marginTop: "12px",
              padding: "12px 24px",
              fontSize: "16px",
              minHeight: "44px",
              cursor: "pointer",
              borderRadius: "8px",
              border: "1px solid #ccc",
            }}
          >
            Go to Checklist
          </button>
        </div>
      ) : (
        <>
          {/* Sort controls */}
          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "13px", color: "#525252", marginBottom: "4px", fontWeight: 500 }}>Sort by</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} role="group" aria-label="Sort options">
              <button onClick={() => setSortField("datePlanted")} style={sortButtonStyle("datePlanted")}>
                Date Planted
              </button>
              <button onClick={() => setSortField("plant")} style={sortButtonStyle("plant")}>
                Plant Name
              </button>
              <button onClick={() => setSortField("method")} style={sortButtonStyle("method")}>
                Method
              </button>
            </div>
          </div>

          {/* Filter controls */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "13px", color: "#525252", marginBottom: "4px", fontWeight: 500 }}>Filter by method</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }} role="group" aria-label="Filter options">
              <button onClick={() => setFilterMethod("all")} style={filterButtonStyle("all")}>
                All
              </button>
              <button onClick={() => setFilterMethod("cold_sow")} style={filterButtonStyle("cold_sow")}>
                Cold Sow
              </button>
              <button onClick={() => setFilterMethod("direct_sow")} style={filterButtonStyle("direct_sow")}>
                Direct Sow
              </button>
            </div>
          </div>

          {filteredAndSorted.length === 0 ? (
            <p style={{ color: "#6b6b6b", fontSize: "16px", textAlign: "center", padding: "16px 0" }}>
              No plantings match this filter
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }} role="list" aria-label="Plantings">
              {filteredAndSorted.map((row) => (
                <li
                  key={row.planting.id}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${row.seed?.plant ?? "Unknown"} planted ${row.planting.datePlanted}`}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    minHeight: "44px",
                  }}
                  onClick={() => navigate(`/planted/${row.planting.id}`)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/planted/${row.planting.id}`); } }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      {row.seed ? `${row.seed.plant}` : `Seed #${row.planting.seedId}`}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b6b6b", flexShrink: 0 }}>
                      {row.planting.datePlanted}
                    </div>
                  </div>
                  {row.seed?.varietal && (
                    <div style={{ color: "#525252", fontSize: "14px" }}>
                      {row.seed.varietal}
                    </div>
                  )}
                  <div style={{ fontSize: "13px", color: "#525252", marginTop: "4px" }}>
                    {methodLabel[row.planting.method] ?? row.planting.method}
                    {row.planting.bedLocation ? ` \u00B7 ${row.planting.bedLocation}` : ""}
                  </div>
                  {row.weather && (
                    <div style={{ fontSize: "12px", color: "#6b6b6b", marginTop: "2px" }}>
                      {formatWeatherInline(row.weather)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <BottomNav />
    </div>
  );
}
