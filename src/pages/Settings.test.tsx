import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { Settings } from "./Settings.tsx";
import { ensureDefaultPin, getSetting, setSetting, SETTING_KEYS, setAuthenticated } from "../utils/pin.ts";
import { createSeedDAO } from "../db/seeds.ts";
import type { Seed } from "../types/index.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

function renderSettings() {
  const downloadMock = vi.fn();
  const routes = [
    { path: "/settings", element: <Settings db={db} onDownloadCsv={downloadMock} /> },
    { path: "/", element: <div>Home Page</div> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: ["/settings"] });
  render(<RouterProvider router={router} />);
  return { downloadMock };
}

const testSeed: Omit<Seed, "id"> = {
  plant: "Tomato",
  varietal: "Roma",
  seedOrStart: "Seed",
  purchased: true,
  coldSowStart: "2026-02-15",
  coldSowEnd: "2026-03-15",
  directSowStart: "2026-05-01",
  directSowEnd: "2026-06-15",
  soilTempMin: 60,
  soilTempMax: 85,
  notes: "Test seed",
};

beforeEach(async () => {
  dbName = `test-settings-page-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
  setAuthenticated(true);
  await ensureDefaultPin(db);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("Settings page", () => {
  it("renders heading and sections", async () => {
    renderSettings();
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Change PIN" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frost Dates" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Season Year" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Data Export" })).toBeInTheDocument();
  });

  it("shows default frost dates", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const lastFrostInput = screen.getByLabelText("Last Frost (spring)");
    const firstFrostInput = screen.getByLabelText("First Frost (fall)");
    expect(lastFrostInput).toHaveValue("05-18");
    expect(firstFrostInput).toHaveValue("09-30");
  });

  it("loads previously saved frost dates", async () => {
    await setSetting(SETTING_KEYS.LAST_FROST, "04-25", db);
    await setSetting(SETTING_KEYS.FIRST_FROST, "10-15", db);
    renderSettings();
    await waitFor(() => {
      expect(screen.getByLabelText("Last Frost (spring)")).toHaveValue("04-25");
    });
    expect(screen.getByLabelText("First Frost (fall)")).toHaveValue("10-15");
  });

  it("saves frost dates", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    const lastFrostInput = screen.getByLabelText("Last Frost (spring)");
    await user.clear(lastFrostInput);
    await user.type(lastFrostInput, "04-30");

    await user.click(screen.getByRole("button", { name: "Save Frost Dates" }));
    await waitFor(() => {
      expect(screen.getByText("Frost dates saved")).toBeInTheDocument();
    });

    // Verify in DB
    const saved = await getSetting(SETTING_KEYS.LAST_FROST, db);
    expect(saved).toBe("04-30");
  });

  it("saves season year", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    const yearInput = screen.getByLabelText("Year");
    await user.clear(yearInput);
    await user.type(yearInput, "2027");

    await user.click(screen.getByRole("button", { name: "Save Season Year" }));
    await waitFor(() => {
      expect(screen.getByText("Season year saved")).toBeInTheDocument();
    });

    const saved = await getSetting(SETTING_KEYS.SEASON_YEAR, db);
    expect(saved).toBe("2027");
  });

  it("changes PIN successfully", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Current PIN"), "1701");
    await user.type(screen.getByLabelText("New PIN"), "9999");
    await user.type(screen.getByLabelText("Confirm New PIN"), "9999");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("PIN changed successfully");
    });
  });

  it("rejects PIN change with wrong current PIN", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Current PIN"), "0000");
    await user.type(screen.getByLabelText("New PIN"), "9999");
    await user.type(screen.getByLabelText("Confirm New PIN"), "9999");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Current PIN is incorrect");
    });
  });

  it("rejects PIN change when new PINs don't match", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Current PIN"), "1701");
    await user.type(screen.getByLabelText("New PIN"), "9999");
    await user.type(screen.getByLabelText("Confirm New PIN"), "1111");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("New PINs do not match");
    });
  });

  it("rejects PIN change when new PIN is not 4 digits", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Current PIN"), "1701");
    await user.type(screen.getByLabelText("New PIN"), "12");
    await user.type(screen.getByLabelText("Confirm New PIN"), "12");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("New PIN must be exactly 4 digits");
    });
  });

  it("rejects PIN change when current PIN is empty", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("New PIN"), "9999");
    await user.type(screen.getByLabelText("Confirm New PIN"), "9999");
    await user.click(screen.getByRole("button", { name: "Change PIN" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Enter your current 4-digit PIN");
    });
  });

  it("exports seeds as CSV", async () => {
    const dao = createSeedDAO(db);
    await dao.add(testSeed);
    const { downloadMock } = renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Export Seeds CSV" }));

    await waitFor(() => {
      expect(screen.getByText("Exported 1 seeds")).toBeInTheDocument();
    });
    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [csv, filename] = downloadMock.mock.calls[0];
    expect(csv).toContain("Tomato");
    expect(filename).toMatch(/sow-what-seeds-\d{4}\.csv/);
  });

  it("shows message when no seeds to export", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Export Seeds CSV" }));

    await waitFor(() => {
      expect(screen.getByText("No seeds to export")).toBeInTheDocument();
    });
  });

  it("has accessible section headings", async () => {
    renderSettings();
    await screen.findByRole("heading", { name: "Settings" });
    // All sections should have aria-labelledby matching their heading
    const sections = document.querySelectorAll("section[aria-labelledby]");
    expect(sections.length).toBe(4);
  });
});
