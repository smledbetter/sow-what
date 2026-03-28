import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Seed, SowMethod } from "../types/index.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { getSeedsForDate, todayISO } from "../utils/checklist.ts";
import {
  createPlantingRecord,
  removePlantingRecord,
} from "../utils/planting.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { BottomNav } from "../components/BottomNav.tsx";
import { fetchWeather } from "../utils/weather-client.ts";
import { getPlantingWarnings, shortDayLabel } from "../utils/weather-warnings.ts";
import type { PlantingWarning } from "../utils/weather-warnings.ts";
import type { SowWhatDB } from "../db/database.ts";

const PLANTED_HIDE_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface HomeProps {
  db?: SowWhatDB;
  /** Override today's date for testing (ISO string YYYY-MM-DD) */
  today?: string;
  /** Override current timestamp for testing (ISO datetime string) */
  now?: string;
}

export function Home({ db, today, now }: HomeProps = {}) {
  const navigate = useNavigate();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [activeTab, setActiveTab] = useState<SowMethod>("cold_sow");
  /** Maps seedId → plantingId for seeds checked off recently (< 12h) */
  const [plantedMap, setPlantedMap] = useState<Map<number, number>>(new Map());
  /** Seed IDs that were planted > 12h ago — hidden from checklist */
  const [hiddenSeedIds, setHiddenSeedIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<PlantingWarning[]>([]);

  const dao = useMemo(() => (db ? createSeedDAO(db) : createSeedDAO()), [db]);
  const currentDate = today ?? todayISO();
  const nowMs = now ? new Date(now).getTime() : Date.now();

  // Load seeds
  useEffect(() => {
    let cancelled = false;
    dao.getAll().then((all) => {
      if (!cancelled) setSeeds(all);
    });
    return () => { cancelled = true; };
  }, [dao]);

  // Load existing plantings — recent ones show crossed out, stale ones are hidden
  useEffect(() => {
    let cancelled = false;
    const plantingDAO = db ? createPlantingDAO(db) : createPlantingDAO();
    plantingDAO.getAll().then((all) => {
      if (cancelled) return;
      const recent = new Map<number, number>();
      const hidden = new Set<number>();
      for (const p of all) {
        if (p.id === undefined) continue;
        const plantedAtMs = p.plantedAt ? new Date(p.plantedAt).getTime() : 0;
        const age = nowMs - plantedAtMs;
        if (age >= PLANTED_HIDE_MS) {
          hidden.add(p.seedId);
        } else {
          recent.set(p.seedId, p.id);
        }
      }
      setPlantedMap(recent);
      setHiddenSeedIds(hidden);
    });
    return () => { cancelled = true; };
  }, [db, nowMs]);

  // Fetch weather warnings
  useEffect(() => {
    let cancelled = false;
    fetchWeather({ db }).then((data) => {
      if (cancelled || !data) return;
      setWarnings(getPlantingWarnings(data.forecast));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [db]);

  const checklistSeeds = useMemo(
    () => getSeedsForDate(seeds, activeTab, currentDate)
      .filter((s) => !hiddenSeedIds.has(s.id!)),
    [seeds, activeTab, currentDate, hiddenSeedIds]
  );

  const toggleCheck = useCallback(async (seedId: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const existingPlantingId = plantedMap.get(seedId);
      if (existingPlantingId !== undefined) {
        // Uncheck: remove planting record
        await removePlantingRecord(existingPlantingId, db);
        setPlantedMap((prev) => {
          const next = new Map(prev);
          next.delete(seedId);
          return next;
        });
      } else {
        // Check: create planting record
        const result = await createPlantingRecord(seedId, activeTab, currentDate, db);
        setPlantedMap((prev) => {
          const next = new Map(prev);
          next.set(seedId, result.plantingId);
          return next;
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, plantedMap, activeTab, currentDate, db]);

  const tabStyle = (tab: SowMethod): React.CSSProperties => ({
    flex: 1,
    padding: "12px",
    fontSize: "16px",
    fontWeight: activeTab === tab ? "bold" : "normal",
    backgroundColor: activeTab === tab ? "#2e7d32" : "#e0e0e0",
    color: activeTab === tab ? "#fff" : "#333",
    border: "none",
    cursor: "pointer",
    minHeight: "44px",
    borderRadius: tab === "cold_sow" ? "8px 0 0 8px" : "0 8px 8px 0",
  });

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "24px" }}>Sow What</h1>
          <p style={{ margin: "0 0 16px 0", color: "#525252", fontSize: "14px" }}>
            {currentDate}
          </p>
        </div>
        {warnings.length > 0 && (
          <div
            role="alert"
            aria-label="Weather warnings"
            style={{
              backgroundColor: "#fff3e0",
              border: "1px solid #e65100",
              borderRadius: "8px",
              padding: "6px 10px",
              maxWidth: "180px",
              fontSize: "12px",
              lineHeight: 1.4,
              color: "#bf360c",
            }}
          >
            {warnings.map((w) => (
              <div key={w.label} style={{ marginBottom: warnings.indexOf(w) < warnings.length - 1 ? "4px" : 0 }}>
                <span aria-hidden="true">{w.icon}</span>{" "}
                <strong>{w.label}</strong>{" "}
                {w.days.map((d) => shortDayLabel(d, currentDate)).join(", ")}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{ display: "flex", marginBottom: "16px" }}
        role="tablist"
        aria-label="Sow method"
      >
        <button
          role="tab"
          aria-selected={activeTab === "cold_sow"}
          onClick={() => setActiveTab("cold_sow")}
          style={tabStyle("cold_sow")}
        >
          Cold Sow
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "direct_sow"}
          onClick={() => setActiveTab("direct_sow")}
          style={tabStyle("direct_sow")}
        >
          Direct Sow
        </button>
      </div>

      {checklistSeeds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ color: "#6b6b6b", fontSize: "16px" }}>
            Nothing to sow today
          </p>
          <button
            onClick={() => navigate("/seeds")}
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
            View Seed Inventory
          </button>
        </div>
      ) : (
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          role="list"
          aria-label="Checklist"
        >
          {checklistSeeds.map((seed) => {
            const isChecked = plantedMap.has(seed.id!);
            return (
              <li
                key={seed.id}
                role="listitem"
                aria-label={`${isChecked ? "Planted: " : ""}${seed.plant}${seed.varietal ? ` — ${seed.varietal}` : ""}`}
                tabIndex={0}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  minHeight: "44px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  opacity: isChecked ? 0.6 : 1,
                }}
                onClick={() => { void toggleCheck(seed.id!); }}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void toggleCheck(seed.id!); } }}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    border: `2px solid ${isChecked ? "#2e7d32" : "#ccc"}`,
                    backgroundColor: isChecked ? "#2e7d32" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#fff",
                    fontSize: "14px",
                  }}
                  aria-hidden="true"
                >
                  {isChecked ? "\u2713" : ""}
                </span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: "16px",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {seed.plant}
                  </div>
                  <div
                    style={{
                      color: "#525252",
                      fontSize: "14px",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {seed.varietal}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "12px",
                    color: "#6b6b6b",
                    flexShrink: 0,
                  }}
                >
                  {seed.soilTempMin > 0 || seed.soilTempMax > 0
                    ? `${seed.soilTempMin}-${seed.soilTempMax}\u00B0F`
                    : ""}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BottomNav />
    </div>
  );
}
