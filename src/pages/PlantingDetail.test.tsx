import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { createPlantingDAO } from "../db/plantings.ts";
import { createWeatherDAO } from "../db/weather.ts";
import { PlantingDetail } from "./PlantingDetail.tsx";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

const makeSeed = () => ({
  plant: "Lettuce",
  varietal: "Forellenschluss",
  seedOrStart: "Seed" as const,
  purchased: true,
  coldSowStart: "2026-02-20",
  coldSowEnd: "2026-03-10",
  directSowStart: "2026-04-01",
  directSowEnd: "2026-05-15",
  soilTempMin: 40,
  soilTempMax: 75,
  notes: "",
});

async function setupPlanting(overrides: Record<string, unknown> = {}) {
  const seedDAO = createSeedDAO(db);
  const seedId = await seedDAO.add(makeSeed());

  const weatherDAO = createWeatherDAO(db);
  const weatherId = await weatherDAO.add({
    date: "2026-03-15",
    tempHigh: 58,
    tempLow: 42,
    precipitation: 0.1,
    conditions: "Partly cloudy",
    rawJson: "{}",
  });

  const plantingDAO = createPlantingDAO(db);
  const plantingId = await plantingDAO.add({
    seedId,
    method: "cold_sow",
    datePlanted: "2026-03-15",
    plantedAt: "2026-03-15T10:00:00.000Z",
    bedLocation: "",
    germinationDate: "",
    expectedHarvest: "",
    weatherSnapshotId: weatherId,
    ...overrides,
  });

  return { seedId, weatherId, plantingId };
}

function renderDetail(plantingId: number | string) {
  const routes = [
    { path: "/planted/:id", element: <PlantingDetail db={db} /> },
    { path: "/planted", element: <div>Planted List</div> },
  ];
  const router = createMemoryRouter(routes, {
    initialEntries: [`/planted/${plantingId}`],
  });
  return render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  dbName = `test-planting-detail-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("PlantingDetail", () => {
  it("shows seed name and planting info", async () => {
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    expect(await screen.findByText(/Lettuce — Forellenschluss/)).toBeInTheDocument();
    expect(screen.getByText(/Cold Sow/)).toBeInTheDocument();
    expect(screen.getByText(/2026-03-15/)).toBeInTheDocument();
  });

  it("shows weather conditions", async () => {
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    expect(await screen.findByText(/Partly cloudy, 58\/42/)).toBeInTheDocument();
  });

  it("shows 'Not recorded' for stub weather", async () => {
    const weatherDAO = createWeatherDAO(db);
    const weatherId = await weatherDAO.add({
      date: "2026-03-15",
      tempHigh: 0,
      tempLow: 0,
      precipitation: 0,
      conditions: "Not recorded",
      rawJson: "{}",
    });

    const seedDAO = createSeedDAO(db);
    const seedId = await seedDAO.add(makeSeed());

    const plantingDAO = createPlantingDAO(db);
    const plantingId = await plantingDAO.add({
      seedId,
      method: "cold_sow",
      datePlanted: "2026-03-15",
      plantedAt: "2026-03-15T10:00:00.000Z",
      bedLocation: "",
      germinationDate: "",
      expectedHarvest: "",
      weatherSnapshotId: weatherId,
    });

    renderDetail(plantingId);
    expect(await screen.findByText("Not recorded")).toBeInTheDocument();
  });

  it("shows not found for invalid id", async () => {
    renderDetail(999);
    expect(await screen.findByText("Planting Not Found")).toBeInTheDocument();
  });

  it("shows not found for non-numeric id", async () => {
    renderDetail("abc");
    expect(await screen.findByText("Planting Not Found")).toBeInTheDocument();
  });

  it("edits bed location and saves", async () => {
    const user = userEvent.setup();
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    const bedInput = await screen.findByLabelText("Bed Location");
    await user.type(bedInput, "Raised Bed A");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(async () => {
      const plantingDAO = createPlantingDAO(db);
      const updated = await plantingDAO.getById(plantingId);
      expect(updated!.bedLocation).toBe("Raised Bed A");
    });
  });

  it("edits germination date and saves", async () => {
    const user = userEvent.setup();
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    const germInput = await screen.findByLabelText("Germination Date");
    await user.clear(germInput);
    await user.type(germInput, "2026-03-25");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(async () => {
      const plantingDAO = createPlantingDAO(db);
      const updated = await plantingDAO.getById(plantingId);
      expect(updated!.germinationDate).toBe("2026-03-25");
    });
  });

  it("edits expected harvest and saves", async () => {
    const user = userEvent.setup();
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    const harvestInput = await screen.findByLabelText("Expected Harvest");
    await user.clear(harvestInput);
    await user.type(harvestInput, "2026-06-01");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(async () => {
      const plantingDAO = createPlantingDAO(db);
      const updated = await plantingDAO.getById(plantingId);
      expect(updated!.expectedHarvest).toBe("2026-06-01");
    });
  });

  it("shows success message after save", async () => {
    const user = userEvent.setup();
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    await screen.findByLabelText("Bed Location");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Changes saved!")).toBeInTheDocument();
  });

  it("displays pre-filled values for existing data", async () => {
    const { plantingId } = await setupPlanting({
      bedLocation: "North plot",
      germinationDate: "2026-03-20",
      expectedHarvest: "2026-06-15",
    });
    renderDetail(plantingId);

    const bedInput = await screen.findByLabelText("Bed Location");
    expect(bedInput).toHaveValue("North plot");
    expect(screen.getByLabelText("Germination Date")).toHaveValue("2026-03-20");
    expect(screen.getByLabelText("Expected Harvest")).toHaveValue("2026-06-15");
  });

  it("has a back button that navigates to planted list", async () => {
    const user = userEvent.setup();
    const { plantingId } = await setupPlanting();
    renderDetail(plantingId);

    const backBtn = await screen.findByText(/Back to Planted/);
    await user.click(backBtn);
    expect(await screen.findByText("Planted List")).toBeInTheDocument();
  });
});
