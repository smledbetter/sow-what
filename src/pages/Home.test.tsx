import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { Home } from "./Home.tsx";
import { Seeds } from "./Seeds.tsx";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

const makeSeed = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

function renderHome(today: string) {
  const routes = [
    { path: "/", element: <Home db={db} today={today} /> },
    { path: "/seeds", element: <Seeds db={db} /> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: ["/"] });
  return render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  dbName = `test-home-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("Home page", () => {
  it("shows the app title", () => {
    renderHome("2026-03-05");
    expect(screen.getByRole("heading", { name: "Sow What" })).toBeInTheDocument();
  });

  it("shows today's date", () => {
    renderHome("2026-03-05");
    expect(screen.getByText("2026-03-05")).toBeInTheDocument();
  });

  it("shows Cold Sow tab selected by default", () => {
    renderHome("2026-03-05");
    const coldTab = screen.getByRole("tab", { name: "Cold Sow" });
    expect(coldTab).toHaveAttribute("aria-selected", "true");
  });

  it("shows 'Nothing to sow today' when no seeds match", () => {
    renderHome("2026-01-01");
    expect(screen.getByText("Nothing to sow today")).toBeInTheDocument();
  });

  it("shows seeds in cold sow window", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10" }),
    ]);

    renderHome("2026-03-05");
    expect(await screen.findByText("Lettuce")).toBeInTheDocument();
    expect(screen.getByText("Forellenschluss")).toBeInTheDocument();
  });

  it("shows soil temp range for seeds", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10", soilTempMin: 40, soilTempMax: 75 }),
    ]);

    renderHome("2026-03-05");
    expect(await screen.findByText("40-75\u00B0F")).toBeInTheDocument();
  });

  it("excludes seeds outside cold sow window", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10" }),
      makeSeed({ plant: "Tomato", coldSowStart: "2026-04-01", coldSowEnd: "2026-04-15" }),
    ]);

    renderHome("2026-03-05");
    expect(await screen.findByText("Lettuce")).toBeInTheDocument();
    expect(screen.queryByText("Tomato")).not.toBeInTheDocument();
  });

  it("switches to Direct Sow tab and shows relevant seeds", async () => {
    const user = userEvent.setup();
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Basil", directSowStart: "2026-04-01", directSowEnd: "2026-05-15", coldSowStart: "", coldSowEnd: "" }),
    ]);

    renderHome("2026-04-10");
    // Cold sow tab shows nothing (empty window)
    expect(screen.getByText("Nothing to sow today")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Direct Sow" }));
    expect(await screen.findByText("Basil")).toBeInTheDocument();
  });

  it("checks off a seed with strike-through on tap", async () => {
    const user = userEvent.setup();
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10" }),
    ]);

    renderHome("2026-03-05");
    const plantName = await screen.findByText("Lettuce");
    expect(plantName).not.toHaveStyle({ textDecoration: "line-through" });

    // Click the list item
    await user.click(plantName.closest("li")!);
    expect(plantName).toHaveStyle({ textDecoration: "line-through" });
  });

  it("unchecks a seed on second tap", async () => {
    const user = userEvent.setup();
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10" }),
    ]);

    renderHome("2026-03-05");
    const plantName = await screen.findByText("Lettuce");
    const listItem = plantName.closest("li")!;

    // Check
    await user.click(listItem);
    expect(plantName).toHaveStyle({ textDecoration: "line-through" });

    // Uncheck
    await user.click(listItem);
    expect(plantName).not.toHaveStyle({ textDecoration: "line-through" });
  });

  it("shows 'View Seed Inventory' link when nothing to sow", () => {
    renderHome("2026-01-01");
    expect(screen.getByRole("button", { name: "View Seed Inventory" })).toBeInTheDocument();
  });

  it("hides soil temp when both min and max are 0", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Mystery", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10", soilTempMin: 0, soilTempMax: 0 }),
    ]);

    renderHome("2026-03-05");
    await screen.findByText("Mystery");
    expect(screen.queryByText(/\u00B0F/)).not.toBeInTheDocument();
  });

  it("shows multiple seeds in the same window", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-10" }),
      makeSeed({ plant: "Kale", varietal: "Lacinato", coldSowStart: "2026-03-01", coldSowEnd: "2026-03-15" }),
    ]);

    renderHome("2026-03-05");
    expect(await screen.findByText("Lettuce")).toBeInTheDocument();
    expect(screen.getByText("Kale")).toBeInTheDocument();
  });

  it("renders navigation buttons", () => {
    renderHome("2026-03-05");
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seeds" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Planted" })).toBeInTheDocument();
  });
});
