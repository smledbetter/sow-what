import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Seed } from "../types/index.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { parseCsv, serializeCsv, downloadCsv } from "../utils/csv.ts";
import type { SowWhatDB } from "../db/database.ts";
import { BottomNav } from "../components/BottomNav.tsx";

export interface SeedsProps {
  db?: SowWhatDB;
}

export function Seeds({ db }: SeedsProps = {}) {
  const navigate = useNavigate();
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [search, setSearch] = useState("");
  const [filterPurchased, setFilterPurchased] = useState<
    "all" | "yes" | "no"
  >("all");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dao = useMemo(() => (db ? createSeedDAO(db) : createSeedDAO()), [db]);

  useEffect(() => {
    let cancelled = false;
    dao.getAll().then((all) => {
      if (!cancelled) setSeeds(all);
    });
    return () => { cancelled = true; };
  }, [dao, refreshKey]);

  const filteredSeeds = seeds.filter((seed) => {
    const matchesSearch =
      search === "" ||
      seed.plant.toLowerCase().includes(search.toLowerCase()) ||
      seed.varietal.toLowerCase().includes(search.toLowerCase());

    const matchesPurchased =
      filterPurchased === "all" ||
      (filterPurchased === "yes" && seed.purchased) ||
      (filterPurchased === "no" && !seed.purchased);

    return matchesSearch && matchesPurchased;
  });

  const handleExport = () => {
    const csv = serializeCsv(seeds);
    downloadCsv(csv, "sow-what-seeds.csv");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const result = parseCsv(text);

    if (result.seeds.length > 0) {
      await dao.bulkAdd(result.seeds);
      setRefreshKey((k) => k + 1);
      setImportMessage(
        `Imported ${result.seeds.length} seed${result.seeds.length === 1 ? "" : "s"}${result.errors.length > 0 ? ` (${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped)` : ""}`
      );
    } else {
      setImportMessage(
        result.errors.length > 0
          ? `Import failed: ${result.errors[0]}`
          : "No seeds found in file"
      );
    }

    // Reset file input so the same file can be re-imported
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto", paddingBottom: "80px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>Seed Inventory</h1>
        <button
          onClick={() => navigate("/seeds/new")}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            fontSize: "18px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
          aria-label="Add seed"
        >
          + Add
        </button>
      </div>

      <div style={{ marginBottom: "12px" }}>
        <input
          type="search"
          placeholder="Search seeds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search seeds"
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "16px",
            boxSizing: "border-box",
            borderRadius: "8px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "12px",
          alignItems: "center",
        }}
      >
        <label htmlFor="filter-purchased" style={{ fontSize: "14px" }}>
          Purchased:
        </label>
        <select
          id="filter-purchased"
          value={filterPurchased}
          onChange={(e) =>
            setFilterPurchased(e.target.value as "all" | "yes" | "no")
          }
          style={{
            padding: "8px",
            fontSize: "16px",
            minHeight: "44px",
            borderRadius: "8px",
          }}
        >
          <option value="all">All</option>
          <option value="yes">Purchased</option>
          <option value="no">Not purchased</option>
        </select>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={handleImportClick}
          style={{
            minHeight: "44px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Import CSV
        </button>
        <button
          onClick={handleExport}
          disabled={seeds.length === 0}
          style={{
            minHeight: "44px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleImportFile}
          style={{ display: "none" }}
          data-testid="csv-file-input"
        />
      </div>

      {importMessage && (
        <div
          role="status"
          style={{
            padding: "8px 12px",
            marginBottom: "12px",
            backgroundColor: "#e8f5e9",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {importMessage}
        </div>
      )}

      <div style={{ fontSize: "14px", color: "#525252", marginBottom: "8px" }}>
        {filteredSeeds.length} seed{filteredSeeds.length === 1 ? "" : "s"}
        {search || filterPurchased !== "all"
          ? ` (of ${seeds.length} total)`
          : ""}
      </div>

      {filteredSeeds.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b6b6b", padding: "32px 0" }}>
          {seeds.length === 0
            ? "No seeds yet. Add one or import a CSV."
            : "No seeds match your search."}
        </p>
      ) : (
        <ul
          style={{ listStyle: "none", padding: 0, margin: 0 }}
          role="list"
          aria-label="Seeds"
        >
          {filteredSeeds.map((seed) => (
            <li
              key={seed.id}
              onClick={() => navigate(`/seeds/${seed.id}`)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(`/seeds/${seed.id}`); } }}
              role="listitem"
              tabIndex={0}
              aria-label={`${seed.plant}${seed.varietal ? ` — ${seed.varietal}` : ""}`}
              style={{
                padding: "12px",
                borderBottom: "1px solid #eee",
                cursor: "pointer",
                minHeight: "44px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {seed.plant}
                </div>
                <div style={{ color: "#525252", fontSize: "14px" }}>
                  {seed.varietal}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "12px", color: "#6b6b6b" }}>
                {seed.purchased ? "Purchased" : "Need to buy"}
              </div>
            </li>
          ))}
        </ul>
      )}

      <BottomNav />
    </div>
  );
}
