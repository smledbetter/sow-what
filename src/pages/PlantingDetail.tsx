import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Planting, Seed, WeatherSnapshot } from "../types/index.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { createWeatherDAO } from "../db/weather.ts";
import type { SowWhatDB } from "../db/database.ts";

export interface PlantingDetailProps {
  db?: SowWhatDB;
}

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

function FormField({ label, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", marginBottom: "4px", fontWeight: "bold", fontSize: "14px" }}>
        {label}
        {children}
      </label>
    </div>
  );
}

const methodLabel: Record<string, string> = {
  cold_sow: "Cold Sow",
  direct_sow: "Direct Sow",
};

export function PlantingDetail({ db }: PlantingDetailProps = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [planting, setPlanting] = useState<Planting | null>(null);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [bedLocation, setBedLocation] = useState("");
  const [germinationDate, setGerminationDate] = useState("");
  const [expectedHarvest, setExpectedHarvest] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const plantingDAO = useMemo(() => (db ? createPlantingDAO(db) : createPlantingDAO()), [db]);
  const seedDAO = useMemo(() => (db ? createSeedDAO(db) : createSeedDAO()), [db]);
  const weatherDAO = useMemo(() => (db ? createWeatherDAO(db) : createWeatherDAO()), [db]);

  useEffect(() => {
    let cancelled = false;
    const plantingId = Number(id);
    if (isNaN(plantingId)) {
      setNotFound(true);
      return;
    }

    plantingDAO.getById(plantingId).then(async (p) => {
      if (cancelled) return;
      if (!p) {
        setNotFound(true);
        return;
      }
      setPlanting(p);
      setBedLocation(p.bedLocation);
      setGerminationDate(p.germinationDate);
      setExpectedHarvest(p.expectedHarvest);

      // Load related seed and weather
      const [s, w] = await Promise.all([
        seedDAO.getById(p.seedId),
        weatherDAO.getById(p.weatherSnapshotId),
      ]);
      if (!cancelled) {
        setSeed(s ?? null);
        setWeather(w ?? null);
      }
    });

    return () => { cancelled = true; };
  }, [id, plantingDAO, seedDAO, weatherDAO]);

  const handleSave = async () => {
    if (!planting?.id) return;
    setSaving(true);
    setSaved(false);
    try {
      await plantingDAO.update(planting.id, {
        bedLocation,
        germinationDate,
        expectedHarvest,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "24px" }}>Planting Not Found</h1>
        <p>This planting record does not exist.</p>
        <button
          onClick={() => navigate("/planted")}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            minHeight: "44px",
            cursor: "pointer",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        >
          Back to Planted
        </button>
      </div>
    );
  }

  if (!planting) {
    return (
      <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
      <button
        onClick={() => navigate("/planted")}
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          fontSize: "14px",
          color: "#2e7d32",
          padding: "0",
          marginBottom: "8px",
        }}
      >
        &larr; Back to Planted
      </button>

      <h1 style={{ fontSize: "24px", margin: "0 0 4px 0" }}>
        {seed ? `${seed.plant} — ${seed.varietal}` : `Planting #${planting.id}`}
      </h1>
      <p style={{ color: "#666", fontSize: "14px", margin: "0 0 16px 0" }}>
        {methodLabel[planting.method] ?? planting.method} &middot; Planted {planting.datePlanted}
      </p>

      {weather && (
        <div
          style={{
            backgroundColor: "#f5f5f5",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontSize: "14px",
          }}
          aria-label="Weather conditions"
        >
          <strong>Weather at planting:</strong>{" "}
          {weather.conditions !== "Not recorded"
            ? `${weather.conditions}, ${weather.tempHigh}/${weather.tempLow}\u00B0F`
            : "Not recorded"}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); void handleSave(); }}
        style={{ display: "flex", flexDirection: "column" }}
      >
        <FormField label="Bed Location">
          <input
            type="text"
            value={bedLocation}
            onChange={(e) => setBedLocation(e.target.value)}
            placeholder="e.g., Raised bed A"
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              boxSizing: "border-box",
              marginTop: "4px",
            }}
          />
        </FormField>

        <FormField label="Germination Date">
          <input
            type="date"
            value={germinationDate}
            onChange={(e) => setGerminationDate(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              boxSizing: "border-box",
              marginTop: "4px",
            }}
          />
        </FormField>

        <FormField label="Expected Harvest">
          <input
            type="date"
            value={expectedHarvest}
            onChange={(e) => setExpectedHarvest(e.target.value)}
            style={{
              display: "block",
              width: "100%",
              padding: "10px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "8px",
              boxSizing: "border-box",
              marginTop: "4px",
            }}
          />
        </FormField>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "12px 24px",
            fontSize: "16px",
            minHeight: "44px",
            backgroundColor: "#2e7d32",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <p style={{ color: "#2e7d32", fontSize: "14px", marginTop: "8px" }}>
            Changes saved!
          </p>
        )}
      </form>
    </div>
  );
}
