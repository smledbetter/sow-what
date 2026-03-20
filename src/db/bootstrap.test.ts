import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockCount = vi.fn();
const mockBulkAdd = vi.fn();

vi.mock("./seeds.ts", () => ({
  seedDAO: {
    count: mockCount,
    bulkAdd: mockBulkAdd,
  },
  createSeedDAO: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bootstrapSeeds", () => {
  it("imports seeds from CSV when DB is empty", async () => {
    mockCount.mockResolvedValue(0);
    mockBulkAdd.mockResolvedValue(1);

    const csvText =
      "plant,varietal,seedOrStart,purchased,coldSowStart,coldSowEnd,directSowStart,directSowEnd,soilTempMin,soilTempMax,notes\nLettuce,Buttercrunch,Seed,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,40,75,test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(csvText),
      }),
    );

    const { bootstrapSeeds } = await import("./bootstrap.ts");
    await bootstrapSeeds();

    expect(mockCount).toHaveBeenCalled();
    expect(mockBulkAdd).toHaveBeenCalledOnce();
  });

  it("skips import when seeds already exist", async () => {
    mockCount.mockResolvedValue(5);

    const { bootstrapSeeds } = await import("./bootstrap.ts");
    await bootstrapSeeds();

    expect(mockCount).toHaveBeenCalled();
    expect(mockBulkAdd).not.toHaveBeenCalled();
  });

  it("handles fetch failure gracefully", async () => {
    mockCount.mockResolvedValue(0);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const { bootstrapSeeds } = await import("./bootstrap.ts");
    await bootstrapSeeds();

    expect(mockBulkAdd).not.toHaveBeenCalled();
  });

  it("handles non-ok response", async () => {
    mockCount.mockResolvedValue(0);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false }),
    );

    const { bootstrapSeeds } = await import("./bootstrap.ts");
    await bootstrapSeeds();

    expect(mockBulkAdd).not.toHaveBeenCalled();
  });

  it("handles empty CSV gracefully", async () => {
    mockCount.mockResolvedValue(0);

    const csvText =
      "plant,varietal,seedOrStart,purchased,coldSowStart,coldSowEnd,directSowStart,directSowEnd,soilTempMin,soilTempMax,notes\n";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(csvText),
      }),
    );

    const { bootstrapSeeds } = await import("./bootstrap.ts");
    await bootstrapSeeds();

    expect(mockBulkAdd).not.toHaveBeenCalled();
  });
});
