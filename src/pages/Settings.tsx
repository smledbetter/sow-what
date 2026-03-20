import { useState, useEffect, useMemo } from "react";
import {
  changePin,
  getSetting,
  setSetting,
  SETTING_KEYS,
  DEFAULT_LAST_FROST,
  DEFAULT_FIRST_FROST,
} from "../utils/pin.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { serializeCsv, downloadCsv } from "../utils/csv.ts";
import { BottomNav } from "../components/BottomNav.tsx";
import type { SowWhatDB } from "../db/database.ts";

export interface SettingsProps {
  db?: SowWhatDB;
  /** Override download function for testing */
  onDownloadCsv?: (csv: string, filename: string) => void;
}

export function Settings({ db, onDownloadCsv }: SettingsProps = {}) {
  // PIN change state
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState("");
  const [pinError, setPinError] = useState(false);

  // Frost dates state
  const [lastFrost, setLastFrost] = useState(DEFAULT_LAST_FROST);
  const [firstFrost, setFirstFrost] = useState(DEFAULT_FIRST_FROST);
  const [frostSaved, setFrostSaved] = useState(false);

  // Season year state
  const [seasonYear, setSeasonYear] = useState(String(new Date().getFullYear()));
  const [yearSaved, setYearSaved] = useState(false);

  // Export state
  const [exportMessage, setExportMessage] = useState("");

  const seedDAO = useMemo(() => (db ? createSeedDAO(db) : createSeedDAO()), [db]);

  // Load settings on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const lf = await getSetting(SETTING_KEYS.LAST_FROST, db);
      const ff = await getSetting(SETTING_KEYS.FIRST_FROST, db);
      const sy = await getSetting(SETTING_KEYS.SEASON_YEAR, db);
      if (cancelled) return;
      if (lf) setLastFrost(lf);
      if (ff) setFirstFrost(ff);
      if (sy) setSeasonYear(sy);
    };
    void load();
    return () => { cancelled = true; };
  }, [db]);

  const handlePinChange = async () => {
    setPinMessage("");
    setPinError(false);

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinMessage("New PIN must be exactly 4 digits");
      setPinError(true);
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage("New PINs do not match");
      setPinError(true);
      return;
    }
    if (currentPin.length !== 4) {
      setPinMessage("Enter your current 4-digit PIN");
      setPinError(true);
      return;
    }

    const success = await changePin(currentPin, newPin, db);
    if (success) {
      setPinMessage("PIN changed successfully");
      setPinError(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } else {
      setPinMessage("Current PIN is incorrect");
      setPinError(true);
    }
  };

  const handleSaveFrostDates = async () => {
    await setSetting(SETTING_KEYS.LAST_FROST, lastFrost, db);
    await setSetting(SETTING_KEYS.FIRST_FROST, firstFrost, db);
    setFrostSaved(true);
    setTimeout(() => setFrostSaved(false), 2000);
  };

  const handleSaveSeasonYear = async () => {
    await setSetting(SETTING_KEYS.SEASON_YEAR, seasonYear, db);
    setYearSaved(true);
    setTimeout(() => setYearSaved(false), 2000);
  };

  const handleExport = async () => {
    const seeds = await seedDAO.getAll();
    if (seeds.length === 0) {
      setExportMessage("No seeds to export");
      return;
    }
    const csv = serializeCsv(seeds);
    const filename = `sow-what-seeds-${seasonYear}.csv`;
    if (onDownloadCsv) {
      onDownloadCsv(csv, filename);
    } else {
      downloadCsv(csv, filename);
    }
    setExportMessage(`Exported ${seeds.length} seeds`);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    minHeight: "44px",
    boxSizing: "border-box",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "12px 24px",
    fontSize: "16px",
    minHeight: "44px",
    cursor: "pointer",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "var(--color-primary)",
    color: "#fff",
    fontWeight: "bold",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "24px",
    padding: "16px",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
  };

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <h1 style={{ margin: "0 0 24px 0", fontSize: "24px" }}>Settings</h1>

      {/* Change PIN */}
      <section style={sectionStyle} aria-labelledby="pin-heading">
        <h2 id="pin-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
          Change PIN
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label>
            <span style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Current PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={inputStyle}
              autoComplete="off"
            />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              New PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={inputStyle}
              autoComplete="off"
            />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Confirm New PIN
            </span>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={inputStyle}
              autoComplete="off"
            />
          </label>
          <button
            onClick={() => { void handlePinChange(); }}
            style={buttonStyle}
          >
            Change PIN
          </button>
          {pinMessage && (
            <div
              role="alert"
              style={{
                color: pinError ? "var(--color-danger)" : "var(--color-primary-dark)",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              {pinMessage}
            </div>
          )}
        </div>
      </section>

      {/* Frost Dates */}
      <section style={sectionStyle} aria-labelledby="frost-heading">
        <h2 id="frost-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
          Frost Dates
        </h2>
        <p style={{ margin: "0 0 12px 0", fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Set your local frost dates (MM-DD format)
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label>
            <span style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Last Frost (spring)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={lastFrost}
              onChange={(e) => setLastFrost(e.target.value)}
              placeholder="MM-DD"
              style={inputStyle}
            />
          </label>
          <label>
            <span style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              First Frost (fall)
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={firstFrost}
              onChange={(e) => setFirstFrost(e.target.value)}
              placeholder="MM-DD"
              style={inputStyle}
            />
          </label>
          <button
            onClick={() => { void handleSaveFrostDates(); }}
            style={buttonStyle}
          >
            Save Frost Dates
          </button>
          {frostSaved && (
            <div role="status" style={{ color: "var(--color-primary-dark)", fontSize: "14px", fontWeight: "bold" }}>
              Frost dates saved
            </div>
          )}
        </div>
      </section>

      {/* Season Year */}
      <section style={sectionStyle} aria-labelledby="year-heading">
        <h2 id="year-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
          Season Year
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label>
            <span style={{ display: "block", marginBottom: "4px", fontSize: "14px", color: "var(--color-text-secondary)" }}>
              Year
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={seasonYear}
              onChange={(e) => setSeasonYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              style={inputStyle}
            />
          </label>
          <button
            onClick={() => { void handleSaveSeasonYear(); }}
            style={buttonStyle}
          >
            Save Season Year
          </button>
          {yearSaved && (
            <div role="status" style={{ color: "var(--color-primary-dark)", fontSize: "14px", fontWeight: "bold" }}>
              Season year saved
            </div>
          )}
        </div>
      </section>

      {/* Data Export */}
      <section style={sectionStyle} aria-labelledby="export-heading">
        <h2 id="export-heading" style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
          Data Export
        </h2>
        <button
          onClick={() => { void handleExport(); }}
          style={buttonStyle}
        >
          Export Seeds CSV
        </button>
        {exportMessage && (
          <div
            role="status"
            style={{
              marginTop: "12px",
              color: "var(--color-primary-dark)",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            {exportMessage}
          </div>
        )}
      </section>

      <BottomNav />
    </div>
  );
}
