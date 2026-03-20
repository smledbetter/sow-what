import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Seed } from "../types/index.ts";
import { createSeedDAO } from "../db/seeds.ts";
import type { SowWhatDB } from "../db/database.ts";

export interface SeedDetailProps {
  db?: SowWhatDB;
}

const emptyForm: Omit<Seed, "id"> = {
  plant: "",
  varietal: "",
  seedOrStart: "Seed",
  purchased: false,
  coldSowStart: "",
  coldSowEnd: "",
  directSowStart: "",
  directSowEnd: "",
  soilTempMin: 0,
  soilTempMax: 0,
  notes: "",
};

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
}

function FormField({ label, children }: FormFieldProps) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label
        style={{
          display: "block",
          fontSize: "14px",
          fontWeight: "bold",
          marginBottom: "4px",
        }}
      >
        {label}
        {children}
      </label>
    </div>
  );
}

export function SeedDetail({ db }: SeedDetailProps = {}) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === "new";
  const seedId = isNew ? null : Number(id);

  const dao = db ? createSeedDAO(db) : createSeedDAO();

  const [form, setForm] = useState<Omit<Seed, "id">>(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (isNew || seedId === null) return;
    let cancelled = false;
    (async () => {
      const seed = await dao.getById(seedId);
      if (cancelled) return;
      if (!seed) {
        setNotFound(true);
      } else {
        setForm({
          plant: seed.plant,
          varietal: seed.varietal,
          seedOrStart: seed.seedOrStart,
          purchased: seed.purchased,
          coldSowStart: seed.coldSowStart,
          coldSowEnd: seed.coldSowEnd,
          directSowStart: seed.directSowStart,
          directSowEnd: seed.directSowEnd,
          soilTempMin: seed.soilTempMin,
          soilTempMax: seed.soilTempMax,
          notes: seed.notes,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [seedId, isNew]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = <K extends keyof Omit<Seed, "id">>(
    key: K,
    value: Omit<Seed, "id">[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plant.trim()) return;

    if (isNew) {
      await dao.add(form);
    } else if (seedId !== null) {
      await dao.update(seedId, form);
    }
    navigate("/seeds");
  };

  const handleDelete = async () => {
    if (seedId === null) return;
    await dao.delete(seedId);
    navigate("/seeds");
  };

  if (loading) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>Loading...</div>
    );
  }

  if (notFound) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        <h1>Seed not found</h1>
        <button
          onClick={() => navigate("/seeds")}
          style={{ minHeight: "44px", padding: "8px 16px", cursor: "pointer" }}
        >
          Back to Seeds
        </button>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    fontSize: "16px",
    boxSizing: "border-box",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minHeight: "44px",
  };

  return (
    <div style={{ padding: "16px", maxWidth: "600px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px" }}>
          {isNew ? "Add Seed" : "Edit Seed"}
        </h1>
        <button
          onClick={() => navigate("/seeds")}
          style={{
            minHeight: "44px",
            padding: "8px 16px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSave}>
        <FormField label="Plant">
          <input
            type="text"
            value={form.plant}
            onChange={(e) => updateField("plant", e.target.value)}
            placeholder="e.g., Lettuce"
            required
            style={inputStyle}
          />
        </FormField>

        <FormField label="Varietal">
          <input
            type="text"
            value={form.varietal}
            onChange={(e) => updateField("varietal", e.target.value)}
            placeholder="e.g., Forellenschluss"
            style={inputStyle}
          />
        </FormField>

        <FormField label="Seed or Start">
          <select
            value={form.seedOrStart}
            onChange={(e) =>
              updateField("seedOrStart", e.target.value as "Seed" | "Start")
            }
            style={inputStyle}
          >
            <option value="Seed">Seed</option>
            <option value="Start">Start</option>
          </select>
        </FormField>

        <div style={{ marginBottom: "12px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "16px",
              minHeight: "44px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.purchased}
              onChange={(e) => updateField("purchased", e.target.checked)}
              style={{ width: "24px", height: "24px" }}
            />
            Purchased
          </label>
        </div>

        <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
          Cold Sow Window
        </h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <FormField label="Start">
            <input
              type="date"
              value={form.coldSowStart}
              onChange={(e) => updateField("coldSowStart", e.target.value)}
              style={inputStyle}
            />
          </FormField>
          <FormField label="End">
            <input
              type="date"
              value={form.coldSowEnd}
              onChange={(e) => updateField("coldSowEnd", e.target.value)}
              style={inputStyle}
            />
          </FormField>
        </div>

        <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
          Direct Sow Window
        </h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <FormField label="Start">
            <input
              type="date"
              value={form.directSowStart}
              onChange={(e) => updateField("directSowStart", e.target.value)}
              style={inputStyle}
            />
          </FormField>
          <FormField label="End">
            <input
              type="date"
              value={form.directSowEnd}
              onChange={(e) => updateField("directSowEnd", e.target.value)}
              style={inputStyle}
            />
          </FormField>
        </div>

        <h2 style={{ fontSize: "18px", marginTop: "24px" }}>
          Soil Temperature (F)
        </h2>

        <div style={{ display: "flex", gap: "8px" }}>
          <FormField label="Min">
            <input
              type="number"
              value={form.soilTempMin}
              onChange={(e) =>
                updateField("soilTempMin", Number(e.target.value))
              }
              style={inputStyle}
            />
          </FormField>
          <FormField label="Max">
            <input
              type="number"
              value={form.soilTempMax}
              onChange={(e) =>
                updateField("soilTempMax", Number(e.target.value))
              }
              style={inputStyle}
            />
          </FormField>
        </div>

        <FormField label="Notes">
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: "80px",
            }}
          />
        </FormField>

        <button
          type="submit"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "12px",
            fontSize: "18px",
            fontWeight: "bold",
            backgroundColor: "#2d5016",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginTop: "16px",
          }}
        >
          {isNew ? "Add Seed" : "Save Changes"}
        </button>
      </form>

      {!isNew && (
        <div style={{ marginTop: "24px", textAlign: "center" }}>
          {confirmDelete ? (
            <div>
              <p style={{ color: "#c62828", fontWeight: "bold" }}>
                Delete this seed? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button
                  onClick={handleDelete}
                  style={{
                    minHeight: "44px",
                    padding: "8px 24px",
                    fontSize: "16px",
                    backgroundColor: "#c62828",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{
                    minHeight: "44px",
                    padding: "8px 24px",
                    fontSize: "16px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{
                minHeight: "44px",
                padding: "8px 24px",
                fontSize: "16px",
                color: "#c62828",
                backgroundColor: "transparent",
                border: "1px solid #c62828",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Delete Seed
            </button>
          )}
        </div>
      )}
    </div>
  );
}
