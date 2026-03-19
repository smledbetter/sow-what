import type { Seed } from "../types/index.ts";

const CSV_HEADERS = [
  "plant",
  "varietal",
  "seedOrStart",
  "purchased",
  "coldSowStart",
  "coldSowEnd",
  "directSowStart",
  "directSowEnd",
  "soilTempMin",
  "soilTempMax",
  "notes",
] as const;

/** Escape a CSV field: wrap in quotes if it contains comma, quote, or newline */
function escapeField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Parse a single CSV line respecting quoted fields */
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Convert a Seed to a CSV field array */
function seedToRow(seed: Seed): string[] {
  return [
    seed.plant,
    seed.varietal,
    seed.seedOrStart,
    seed.purchased ? "true" : "false",
    seed.coldSowStart,
    seed.coldSowEnd,
    seed.directSowStart,
    seed.directSowEnd,
    String(seed.soilTempMin),
    String(seed.soilTempMax),
    seed.notes,
  ];
}

/** Convert a CSV field array to a Seed (without id) */
function rowToSeed(fields: string[]): Omit<Seed, "id"> | null {
  if (fields.length < 11) return null;

  const plant = fields[0].trim();
  const varietal = fields[1].trim();
  if (!plant) return null;

  const seedOrStart = fields[2].trim();
  const validSeedOrStart = seedOrStart === "Start" ? "Start" : "Seed";

  const purchased = fields[3].trim().toLowerCase() === "true";

  const soilTempMin = Number(fields[8].trim());
  const soilTempMax = Number(fields[9].trim());

  return {
    plant,
    varietal,
    seedOrStart: validSeedOrStart,
    purchased,
    coldSowStart: fields[4].trim(),
    coldSowEnd: fields[5].trim(),
    directSowStart: fields[6].trim(),
    directSowEnd: fields[7].trim(),
    soilTempMin: Number.isFinite(soilTempMin) ? soilTempMin : 0,
    soilTempMax: Number.isFinite(soilTempMax) ? soilTempMax : 0,
    notes: fields[10]?.trim() ?? "",
  };
}

export interface CsvParseResult {
  seeds: Omit<Seed, "id">[];
  errors: string[];
}

/** Parse CSV text into seed records */
export function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { seeds: [], errors: ["CSV file is empty"] };
  }

  const seeds: Omit<Seed, "id">[] = [];
  const errors: string[] = [];

  // Check if first line is a header row
  const firstFields = parseLine(lines[0]);
  const isHeader =
    firstFields[0].trim().toLowerCase() === "plant" &&
    firstFields[1].trim().toLowerCase() === "varietal";

  const startIndex = isHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    const seed = rowToSeed(fields);
    if (seed) {
      seeds.push(seed);
    } else {
      errors.push(`Row ${i + 1}: insufficient fields or missing plant name`);
    }
  }

  return { seeds, errors };
}

/** Serialize seeds to CSV text with header row */
export function serializeCsv(seeds: Seed[]): string {
  const header = CSV_HEADERS.join(",");
  const rows = seeds.map((seed) =>
    seedToRow(seed).map(escapeField).join(",")
  );
  return [header, ...rows].join("\n");
}

/** Trigger a file download in the browser */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
