import { describe, it, expect } from "vitest";
import { parseCsv, serializeCsv } from "./csv.ts";
import type { Seed } from "../types/index.ts";

const makeSeed = (overrides: Partial<Seed> = {}): Seed => ({
  id: 1,
  plant: "Lettuce",
  varietal: "Forellenschluss",
  seedOrStart: "Seed",
  purchased: true,
  coldSowStart: "2026-02-20",
  coldSowEnd: "2026-03-10",
  directSowStart: "2026-04-01",
  directSowEnd: "2026-05-15",
  soilTempMin: 40,
  soilTempMax: 75,
  notes: "Shade tolerant",
  ...overrides,
});

describe("serializeCsv", () => {
  it("produces header + data rows", () => {
    const csv = serializeCsv([makeSeed()]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      "plant,varietal,seedOrStart,purchased,coldSowStart,coldSowEnd,directSowStart,directSowEnd,soilTempMin,soilTempMax,notes"
    );
    expect(lines[1]).toContain("Lettuce");
    expect(lines[1]).toContain("Forellenschluss");
  });

  it("escapes fields with commas", () => {
    const csv = serializeCsv([makeSeed({ notes: "Needs shade, moisture" })]);
    expect(csv).toContain('"Needs shade, moisture"');
  });

  it("escapes fields with quotes", () => {
    const csv = serializeCsv([makeSeed({ notes: 'Called "Spotted"' })]);
    expect(csv).toContain('"Called ""Spotted"""');
  });

  it("handles empty seed list", () => {
    const csv = serializeCsv([]);
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // just header
  });
});

describe("parseCsv", () => {
  it("parses CSV with header row", () => {
    const csv = serializeCsv([makeSeed()]);
    const result = parseCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.seeds).toHaveLength(1);
    expect(result.seeds[0].plant).toBe("Lettuce");
    expect(result.seeds[0].varietal).toBe("Forellenschluss");
    expect(result.seeds[0].purchased).toBe(true);
    expect(result.seeds[0].soilTempMin).toBe(40);
  });

  it("parses CSV without header row", () => {
    const csv =
      "Lettuce,Forellenschluss,Seed,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,40,75,Shade tolerant";
    const result = parseCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.seeds).toHaveLength(1);
    expect(result.seeds[0].plant).toBe("Lettuce");
  });

  it("handles quoted fields with commas", () => {
    const csv = serializeCsv([makeSeed({ notes: "Needs shade, moisture" })]);
    const result = parseCsv(csv);
    expect(result.seeds[0].notes).toBe("Needs shade, moisture");
  });

  it("handles quoted fields with escaped quotes", () => {
    const csv = serializeCsv([makeSeed({ notes: 'Called "Spotted"' })]);
    const result = parseCsv(csv);
    expect(result.seeds[0].notes).toBe('Called "Spotted"');
  });

  it("returns error for empty CSV", () => {
    const result = parseCsv("");
    expect(result.seeds).toHaveLength(0);
    expect(result.errors).toContain("CSV file is empty");
  });

  it("returns error for rows with insufficient fields", () => {
    const csv =
      "plant,varietal,seedOrStart,purchased,coldSowStart,coldSowEnd,directSowStart,directSowEnd,soilTempMin,soilTempMax,notes\nLettuce,Butter";
    const result = parseCsv(csv);
    expect(result.seeds).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Row 2");
  });

  it("defaults seedOrStart to Seed for invalid values", () => {
    const csv =
      "Lettuce,Butter,Invalid,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,40,75,notes";
    const result = parseCsv(csv);
    expect(result.seeds[0].seedOrStart).toBe("Seed");
  });

  it("defaults soilTemp to 0 for non-numeric values", () => {
    const csv =
      "Lettuce,Butter,Seed,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,abc,xyz,notes";
    const result = parseCsv(csv);
    expect(result.seeds[0].soilTempMin).toBe(0);
    expect(result.seeds[0].soilTempMax).toBe(0);
  });

  it("round-trips multiple seeds", () => {
    const seeds = [
      makeSeed({ id: 1, plant: "Lettuce", varietal: "Butter" }),
      makeSeed({ id: 2, plant: "Tomato", varietal: "Roma", purchased: false }),
      makeSeed({
        id: 3,
        plant: "Kale",
        varietal: "Lacinato",
        seedOrStart: "Start",
      }),
    ];
    const csv = serializeCsv(seeds);
    const result = parseCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.seeds).toHaveLength(3);
    expect(result.seeds[0].plant).toBe("Lettuce");
    expect(result.seeds[1].purchased).toBe(false);
    expect(result.seeds[2].seedOrStart).toBe("Start");
  });

  it("handles Windows line endings", () => {
    const csv =
      "plant,varietal,seedOrStart,purchased,coldSowStart,coldSowEnd,directSowStart,directSowEnd,soilTempMin,soilTempMax,notes\r\nLettuce,Butter,Seed,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,40,75,notes";
    const result = parseCsv(csv);
    expect(result.seeds).toHaveLength(1);
    expect(result.seeds[0].plant).toBe("Lettuce");
  });

  it("skips blank rows in plant name", () => {
    const csv =
      ",Butter,Seed,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,40,75,notes";
    const result = parseCsv(csv);
    expect(result.seeds).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});
