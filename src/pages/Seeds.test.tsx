import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { Seeds } from "./Seeds.tsx";
import { SeedDetail } from "./SeedDetail.tsx";

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
  notes: "Shade tolerant",
  ...overrides,
});

function renderWithRouter(
  element: React.ReactElement,
  path: string,
  routePath: string
) {
  const routes = [
    { path: routePath, element },
    { path: "/seeds", element: <Seeds db={db} /> },
    { path: "/seeds/:id", element: <SeedDetail db={db} /> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  dbName = `test-seeds-page-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("Seeds list page", () => {
  it("shows empty state when no seeds exist", async () => {
    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    expect(
      await screen.findByText("No seeds yet. Add one or import a CSV.")
    ).toBeInTheDocument();
  });

  it("displays seeds from the database", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", varietal: "Butter" }),
      makeSeed({ plant: "Tomato", varietal: "Roma" }),
    ]);

    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    expect(await screen.findByText("Lettuce")).toBeInTheDocument();
    expect(await screen.findByText("Tomato")).toBeInTheDocument();
    expect(screen.getByText("2 seeds")).toBeInTheDocument();
  });

  it("filters seeds by search text", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", varietal: "Butter" }),
      makeSeed({ plant: "Tomato", varietal: "Roma" }),
    ]);

    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Lettuce");

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText("Search seeds");
    await user.type(searchInput, "tomato");

    expect(screen.queryByText("Lettuce")).not.toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
    expect(screen.getByText("1 seed (of 2 total)")).toBeInTheDocument();
  });

  it("filters seeds by purchased status", async () => {
    const dao = createSeedDAO(db);
    await dao.bulkAdd([
      makeSeed({ plant: "Lettuce", purchased: true }),
      makeSeed({ plant: "Tomato", purchased: false }),
    ]);

    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Lettuce");

    const user = userEvent.setup();
    const select = screen.getByLabelText("Purchased:");
    await user.selectOptions(select, "no");

    expect(screen.queryByText("Lettuce")).not.toBeInTheDocument();
    expect(screen.getByText("Tomato")).toBeInTheDocument();
  });

  it("shows 'no match' message when search has no results", async () => {
    const dao = createSeedDAO(db);
    await dao.add(makeSeed({ plant: "Lettuce" }));

    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Lettuce");

    const user = userEvent.setup();
    const searchInput = screen.getByLabelText("Search seeds");
    await user.type(searchInput, "zzzzz");

    expect(
      screen.getByText("No seeds match your search.")
    ).toBeInTheDocument();
  });

  it("has an Add button that navigates to /seeds/new", async () => {
    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Seed Inventory");

    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Add seed"));

    expect(
      await screen.findByRole("heading", { name: "Add Seed" })
    ).toBeInTheDocument();
  });

  it("clicking a seed navigates to its detail page", async () => {
    const dao = createSeedDAO(db);
    await dao.add(makeSeed({ plant: "Lettuce", varietal: "Butter" }));

    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Lettuce");

    const user = userEvent.setup();
    const list = screen.getByRole("list", { name: "Seeds" });
    const item = within(list).getByText("Lettuce");
    await user.click(item);

    // Should navigate to SeedDetail, which shows "Edit Seed" for existing
    expect(await screen.findByText("Edit Seed")).toBeInTheDocument();
  });

  it("disables export button when no seeds exist", async () => {
    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Seed Inventory");
    const exportBtn = screen.getByText("Export CSV");
    expect(exportBtn).toBeDisabled();
  });

  it("imports seeds from a CSV file", async () => {
    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Seed Inventory");

    const csvContent =
      "plant,varietal,seedOrStart,purchased,coldSowStart,coldSowEnd,directSowStart,directSowEnd,soilTempMin,soilTempMax,notes\nLettuce,Butter,Seed,true,2026-02-20,2026-03-10,2026-04-01,2026-05-15,40,75,Test";
    const file = new File([csvContent], "seeds.csv", { type: "text/csv" });

    const user = userEvent.setup();
    const fileInput = screen.getByTestId("csv-file-input") as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(await screen.findByText("Imported 1 seed")).toBeInTheDocument();
    expect(await screen.findByText("Lettuce")).toBeInTheDocument();
  });

  it("shows error message for invalid CSV import", async () => {
    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Seed Inventory");

    const file = new File([""], "empty.csv", { type: "text/csv" });
    const user = userEvent.setup();
    const fileInput = screen.getByTestId("csv-file-input") as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(
      await screen.findByText("Import failed: CSV file is empty")
    ).toBeInTheDocument();
  });

  it("exports seeds as CSV", async () => {
    const dao = createSeedDAO(db);
    await dao.add(makeSeed({ plant: "Lettuce" }));

    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Lettuce");

    const user = userEvent.setup();
    const exportBtn = screen.getByText("Export CSV");
    // Just verify the button is clickable (not disabled) when seeds exist
    expect(exportBtn).not.toBeDisabled();
    // The actual download uses DOM APIs that don't work in jsdom,
    // but we verify the handler doesn't throw
    await user.click(exportBtn);
  });

  it("shows import click triggers file input", async () => {
    renderWithRouter(<Seeds db={db} />, "/seeds", "/seeds");
    await screen.findByText("Seed Inventory");

    const user = userEvent.setup();
    const importBtn = screen.getByText("Import CSV");
    // Button exists and is clickable
    await user.click(importBtn);
  });
});
