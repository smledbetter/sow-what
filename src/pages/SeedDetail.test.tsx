import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { createSeedDAO } from "../db/seeds.ts";
import { SeedDetail } from "./SeedDetail.tsx";
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
  notes: "Shade tolerant",
  ...overrides,
});

function renderDetail(path: string) {
  const routes = [
    { path: "/seeds/:id", element: <SeedDetail db={db} /> },
    { path: "/seeds", element: <Seeds db={db} /> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  dbName = `test-seed-detail-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("SeedDetail - new seed", () => {
  it("shows Add Seed title for new seed route", async () => {
    renderDetail("/seeds/new");
    expect(
      await screen.findByRole("heading", { name: "Add Seed" })
    ).toBeInTheDocument();
  });

  it("creates a new seed and navigates to /seeds", async () => {
    renderDetail("/seeds/new");
    await screen.findByRole("heading", { name: "Add Seed" });

    const user = userEvent.setup();
    const plantInput = screen.getByPlaceholderText("e.g., Lettuce");
    const varietalInput = screen.getByPlaceholderText("e.g., Forellenschluss");

    await user.type(plantInput, "Tomato");
    await user.type(varietalInput, "Roma");

    const submitBtn = screen.getByRole("button", { name: "Add Seed" });
    await user.click(submitBtn);

    // Should navigate to Seeds list
    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();

    // Verify seed was saved in DB
    const dao = createSeedDAO(db);
    const all = await dao.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].plant).toBe("Tomato");
    expect(all[0].varietal).toBe("Roma");
  });

  it("does not create seed without plant name", async () => {
    renderDetail("/seeds/new");
    await screen.findByRole("heading", { name: "Add Seed" });

    const user = userEvent.setup();
    const submitBtn = screen.getByRole("button", { name: "Add Seed" });
    await user.click(submitBtn);

    // Form has required validation -- should still be on the form
    expect(
      screen.getByRole("heading", { name: "Add Seed" })
    ).toBeInTheDocument();
    const dao = createSeedDAO(db);
    expect(await dao.count()).toBe(0);
  });
});

describe("SeedDetail - edit seed", () => {
  it("loads existing seed data into form", async () => {
    const dao = createSeedDAO(db);
    const id = await dao.add(makeSeed());

    renderDetail(`/seeds/${id}`);
    expect(await screen.findByText("Edit Seed")).toBeInTheDocument();

    const plantInput = screen.getByPlaceholderText(
      "e.g., Lettuce"
    ) as HTMLInputElement;
    expect(plantInput.value).toBe("Lettuce");
  });

  it("saves edits and navigates back", async () => {
    const dao = createSeedDAO(db);
    const id = await dao.add(makeSeed());

    renderDetail(`/seeds/${id}`);
    await screen.findByText("Edit Seed");

    const user = userEvent.setup();
    const plantInput = screen.getByPlaceholderText("e.g., Lettuce");
    await user.clear(plantInput);
    await user.type(plantInput, "Kale");

    const saveBtn = screen.getByRole("button", { name: "Save Changes" });
    await user.click(saveBtn);

    // Should navigate to Seeds list
    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();

    // Verify edit was saved
    const updated = await dao.getById(id);
    expect(updated!.plant).toBe("Kale");
  });

  it("shows not found for invalid ID", async () => {
    renderDetail("/seeds/999");
    expect(await screen.findByText("Seed not found")).toBeInTheDocument();
  });
});

describe("SeedDetail - delete seed", () => {
  it("shows confirmation before deleting", async () => {
    const dao = createSeedDAO(db);
    const id = await dao.add(makeSeed());

    renderDetail(`/seeds/${id}`);
    await screen.findByText("Edit Seed");

    const user = userEvent.setup();
    await user.click(screen.getByText("Delete Seed"));

    expect(
      screen.getByText("Delete this seed? This cannot be undone.")
    ).toBeInTheDocument();
  });

  it("deletes seed after confirmation", async () => {
    const dao = createSeedDAO(db);
    const id = await dao.add(makeSeed());

    renderDetail(`/seeds/${id}`);
    await screen.findByText("Edit Seed");

    const user = userEvent.setup();
    await user.click(screen.getByText("Delete Seed"));
    await user.click(screen.getByText("Confirm Delete"));

    // Should navigate to Seeds list
    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();

    // Verify seed was deleted
    const result = await dao.getById(id);
    expect(result).toBeUndefined();
  });

  it("cancels delete on cancel button", async () => {
    const dao = createSeedDAO(db);
    const id = await dao.add(makeSeed());

    renderDetail(`/seeds/${id}`);
    await screen.findByText("Edit Seed");

    const user = userEvent.setup();
    await user.click(screen.getByText("Delete Seed"));

    // There are two Cancel buttons -- the header one and the delete-confirmation one.
    // The delete-confirmation Cancel is the second one.
    const cancelButtons = screen.getAllByRole("button", { name: "Cancel" });
    await user.click(cancelButtons[cancelButtons.length - 1]);

    // Confirmation should be hidden
    await waitFor(() => {
      expect(
        screen.queryByText("Delete this seed? This cannot be undone.")
      ).not.toBeInTheDocument();
    });

    // Seed still exists
    const result = await dao.getById(id);
    expect(result).toBeDefined();
  });
});

describe("SeedDetail - cancel navigation", () => {
  it("cancel button navigates back to seeds list", async () => {
    renderDetail("/seeds/new");
    await screen.findByRole("heading", { name: "Add Seed" });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();
  });
});

describe("SeedDetail - not found", () => {
  it("back button navigates to seeds list", async () => {
    renderDetail("/seeds/999");
    await screen.findByText("Seed not found");

    const user = userEvent.setup();
    await user.click(screen.getByText("Back to Seeds"));

    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();
  });
});

describe("SeedDetail - form fields", () => {
  it("fills all form fields when creating a seed", async () => {
    renderDetail("/seeds/new");
    await screen.findByRole("heading", { name: "Add Seed" });

    const user = userEvent.setup();

    // Text fields
    await user.type(screen.getByPlaceholderText("e.g., Lettuce"), "Kale");
    await user.type(
      screen.getByPlaceholderText("e.g., Forellenschluss"),
      "Lacinato"
    );

    // Select
    await user.selectOptions(screen.getByLabelText("Seed or Start"), "Start");

    // Checkbox
    await user.click(screen.getByLabelText("Purchased"));

    // Textarea
    await user.type(
      screen.getByPlaceholderText("Any additional notes..."),
      "Winter hardy"
    );

    // Submit
    await user.click(screen.getByRole("button", { name: "Add Seed" }));

    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();

    const dao = createSeedDAO(db);
    const seeds = await dao.getAll();
    expect(seeds).toHaveLength(1);
    expect(seeds[0].plant).toBe("Kale");
    expect(seeds[0].varietal).toBe("Lacinato");
    expect(seeds[0].seedOrStart).toBe("Start");
    expect(seeds[0].purchased).toBe(true);
    expect(seeds[0].notes).toBe("Winter hardy");
  });
});
