import { describe, it, expect, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { Planted } from "./Planted.tsx";
import { PlantingDetail } from "./PlantingDetail.tsx";
import { createPlantingDAO } from "../db/plantings.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { createWeatherDAO } from "../db/weather.ts";

let dbCounter = 0;

function freshDB(): SowWhatDB {
  dbCounter += 1;
  return new SowWhatDB(`TestPlantedDB-${dbCounter}-${Date.now()}`);
}

function renderPlanted(db: SowWhatDB) {
  const routes = [
    { path: "/planted", element: <Planted db={db} /> },
    { path: "/planted/:id", element: <PlantingDetail db={db} /> },
    { path: "/", element: <div>Home</div> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: ["/planted"] });
  return render(<RouterProvider router={router} />);
}

async function seedTestData(db: SowWhatDB) {
  const seedDAO = createSeedDAO(db);
  const plantingDAO = createPlantingDAO(db);
  const weatherDAO = createWeatherDAO(db);

  const seedId1 = await seedDAO.add({
    plant: "Spinach",
    varietal: "Bloomsdale",
    seedOrStart: "Seed",
    purchased: true,
    coldSowStart: "2026-01-01",
    coldSowEnd: "2026-04-01",
    directSowStart: "2026-03-01",
    directSowEnd: "2026-06-01",
    soilTempMin: 35,
    soilTempMax: 65,
    notes: "",
  });

  const seedId2 = await seedDAO.add({
    plant: "Tomato",
    varietal: "Cherokee Purple",
    seedOrStart: "Start",
    purchased: true,
    coldSowStart: "",
    coldSowEnd: "",
    directSowStart: "2026-05-01",
    directSowEnd: "2026-07-01",
    soilTempMin: 60,
    soilTempMax: 85,
    notes: "",
  });

  const seedId3 = await seedDAO.add({
    plant: "Arugula",
    varietal: "Rocket",
    seedOrStart: "Seed",
    purchased: true,
    coldSowStart: "2026-02-01",
    coldSowEnd: "2026-04-01",
    directSowStart: "",
    directSowEnd: "",
    soilTempMin: 40,
    soilTempMax: 65,
    notes: "",
  });

  const wId1 = await weatherDAO.add({
    date: "2026-03-15",
    tempHigh: 55,
    tempLow: 38,
    precipitation: 0,
    conditions: "Partly Cloudy",
    rawJson: "{}",
  });

  const wId2 = await weatherDAO.add({
    date: "2026-03-18",
    tempHigh: 0,
    tempLow: 0,
    precipitation: 0,
    conditions: "Not recorded",
    rawJson: "{}",
  });

  const wId3 = await weatherDAO.add({
    date: "2026-03-10",
    tempHigh: 62,
    tempLow: 45,
    precipitation: 0.1,
    conditions: "Sunny",
    rawJson: "{}",
  });

  await plantingDAO.bulkAdd([
    {
      seedId: seedId1,
      method: "cold_sow",
      datePlanted: "2026-03-15",
      plantedAt: "2026-03-15T10:00:00.000Z",
      bedLocation: "Bed A",
      germinationDate: "",
      expectedHarvest: "",
      weatherSnapshotId: wId1,
    },
    {
      seedId: seedId2,
      method: "direct_sow",
      datePlanted: "2026-03-18",
      plantedAt: "2026-03-18T10:00:00.000Z",
      bedLocation: "",
      germinationDate: "",
      expectedHarvest: "",
      weatherSnapshotId: wId2,
    },
    {
      seedId: seedId3,
      method: "cold_sow",
      datePlanted: "2026-03-10",
      plantedAt: "2026-03-10T10:00:00.000Z",
      bedLocation: "Raised bed",
      germinationDate: "",
      expectedHarvest: "",
      weatherSnapshotId: wId3,
    },
  ]);

  return { seedId1, seedId2, seedId3 };
}

afterEach(async () => {
  // Clean up test databases
  const dbs = await Dexie.getDatabaseNames();
  for (const name of dbs) {
    if (name.startsWith("TestPlantedDB-")) {
      await Dexie.delete(name);
    }
  }
});

describe("Planted page", () => {
  it("shows empty state when no plantings exist", async () => {
    const db = freshDB();
    renderPlanted(db);
    await expect(screen.findByText("No plantings yet")).resolves.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to Checklist" })).toBeInTheDocument();
  });

  it("shows heading", async () => {
    const db = freshDB();
    renderPlanted(db);
    expect(screen.getByRole("heading", { name: "Planted" })).toBeInTheDocument();
  });

  it("displays plantings with seed names, methods, and weather", async () => {
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    // Wait for data to load
    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();
    expect(screen.getByText("Bloomsdale")).toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getByText("Cherokee Purple")).toBeInTheDocument();
    expect(screen.getByText("Arugula")).toBeInTheDocument();
    expect(screen.getByText("Rocket")).toBeInTheDocument();

    // Method labels
    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);

    // Weather inline
    expect(screen.getByText("Partly Cloudy, 55/38\u00B0F")).toBeInTheDocument();
    expect(screen.getByText("Sunny, 62/45\u00B0F")).toBeInTheDocument();
    expect(screen.getByText("Weather not recorded")).toBeInTheDocument();
  });

  it("sorts by date planted (newest first) by default", async () => {
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");

    // Newest first: 2026-03-18 (Tomato), 2026-03-15 (Spinach), 2026-03-10 (Arugula)
    expect(items[0]).toHaveTextContent("Tomato");
    expect(items[1]).toHaveTextContent("Spinach");
    expect(items[2]).toHaveTextContent("Arugula");
  });

  it("sorts by plant name alphabetically", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Plant Name" }));

    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");

    // Alpha: Arugula, Spinach, Tomato
    expect(items[0]).toHaveTextContent("Arugula");
    expect(items[1]).toHaveTextContent("Spinach");
    expect(items[2]).toHaveTextContent("Tomato");
  });

  it("sorts by method", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Method" }));

    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");

    // cold_sow before direct_sow alphabetically
    expect(items[0]).toHaveTextContent("Cold Sow");
    expect(items[1]).toHaveTextContent("Cold Sow");
    expect(items[2]).toHaveTextContent("Direct Sow");
  });

  it("filters by cold sow", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    // Click "Cold Sow" filter
    const filterGroup = screen.getByRole("group", { name: "Filter options" });
    await user.click(within(filterGroup).getByText("Cold Sow"));

    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    // Tomato (direct_sow) should not appear
    expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
    expect(screen.getByText("Spinach")).toBeInTheDocument();
    expect(screen.getByText("Arugula")).toBeInTheDocument();
  });

  it("filters by direct sow", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    const filterGroup = screen.getByRole("group", { name: "Filter options" });
    await user.click(within(filterGroup).getByText("Direct Sow"));

    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Tomato");
  });

  it("shows 'no match' message when filter excludes all results", async () => {
    const user = userEvent.setup();
    const db = freshDB();

    // Only add a cold_sow planting
    const seedDAO = createSeedDAO(db);
    const plantingDAO = createPlantingDAO(db);
    const weatherDAO = createWeatherDAO(db);

    const seedId = await seedDAO.add({
      plant: "Lettuce",
      varietal: "Romaine",
      seedOrStart: "Seed",
      purchased: true,
      coldSowStart: "2026-01-01",
      coldSowEnd: "2026-04-01",
      directSowStart: "",
      directSowEnd: "",
      soilTempMin: 35,
      soilTempMax: 65,
      notes: "",
    });

    const wId = await weatherDAO.add({
      date: "2026-03-15",
      tempHigh: 0,
      tempLow: 0,
      precipitation: 0,
      conditions: "Not recorded",
      rawJson: "{}",
    });

    await plantingDAO.add({
      seedId,
      method: "cold_sow",
      datePlanted: "2026-03-15",
      plantedAt: "2026-03-15T10:00:00.000Z",
      bedLocation: "",
      germinationDate: "",
      expectedHarvest: "",
      weatherSnapshotId: wId,
    });

    renderPlanted(db);
    await expect(screen.findByText("Lettuce")).resolves.toBeInTheDocument();

    // Filter by direct_sow -- should show "no match"
    const filterGroup = screen.getByRole("group", { name: "Filter options" });
    await user.click(within(filterGroup).getByText("Direct Sow"));

    expect(screen.getByText("No plantings match this filter")).toBeInTheDocument();
  });

  it("shows bed location when present", async () => {
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    // Spinach has bedLocation "Bed A"
    expect(screen.getByText(/Bed A/)).toBeInTheDocument();
    // Arugula has "Raised bed"
    expect(screen.getByText(/Raised bed/)).toBeInTheDocument();
  });

  it("navigates to planting detail on click", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    // Click on Spinach planting row
    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");
    await user.click(items[1]); // Spinach is index 1 (sorted by date, Tomato first)

    // Should navigate to planting detail
    await waitFor(() => {
      expect(screen.getByText(/Back to Planted/)).toBeInTheDocument();
    });
  });

  it("navigates to home via bottom nav", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    renderPlanted(db);

    await expect(screen.findByText("No plantings yet")).resolves.toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    await user.click(within(nav).getByText("Today"));

    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("shows date on each planting row", async () => {
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    expect(screen.getByText("2026-03-15")).toBeInTheDocument();
    expect(screen.getByText("2026-03-18")).toBeInTheDocument();
    expect(screen.getByText("2026-03-10")).toBeInTheDocument();
  });

  it("resets to all when clicking All filter", async () => {
    const user = userEvent.setup();
    const db = freshDB();
    await seedTestData(db);
    renderPlanted(db);

    await expect(screen.findByText("Spinach")).resolves.toBeInTheDocument();

    // Filter to cold_sow
    const filterGroup = screen.getByRole("group", { name: "Filter options" });
    await user.click(within(filterGroup).getByText("Cold Sow"));
    expect(screen.queryByText("Tomato")).not.toBeInTheDocument();

    // Reset to all
    await user.click(within(filterGroup).getByText("All"));

    const list = screen.getByRole("list", { name: "Plantings" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });
});
