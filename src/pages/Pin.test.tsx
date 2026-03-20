import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import Dexie from "dexie";
import { SowWhatDB } from "../db/database.ts";
import { Pin } from "./Pin.tsx";
import { ensureDefaultPin, setAuthenticated, hashPin, SETTING_KEYS } from "../utils/pin.ts";

let dbCounter = 0;
let db: SowWhatDB;
let dbName: string;

function renderPin(initialPath = "/pin") {
  const routes = [
    { path: "/pin", element: <Pin db={db} /> },
    { path: "/", element: <div>Home Page</div> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

beforeEach(async () => {
  dbName = `test-pin-page-${++dbCounter}`;
  db = new SowWhatDB(dbName);
  await db.open();
  setAuthenticated(false);
});

afterEach(async () => {
  db.close();
  await Dexie.delete(dbName);
});

describe("Pin page", () => {
  it("renders heading and unlock text", async () => {
    await ensureDefaultPin(db);
    renderPin();
    expect(await screen.findByRole("heading", { name: "Enter PIN" })).toBeInTheDocument();
    expect(screen.getByText("Unlock Sow What")).toBeInTheDocument();
  });

  it("renders 4 PIN dots", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-label", "0 of 4 digits entered");
  });

  it("renders numeric pad with digits 0-9 and delete", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    for (let i = 0; i <= 9; i++) {
      expect(screen.getByRole("button", { name: `Digit ${i}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Delete last digit" })).toBeInTheDocument();
  });

  it("fills PIN dots on digit tap", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Digit 1" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "1 of 4 digits entered");

    await user.click(screen.getByRole("button", { name: "Digit 7" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "2 of 4 digits entered");
  });

  it("delete button removes last digit", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Digit 1" }));
    await user.click(screen.getByRole("button", { name: "Digit 7" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "2 of 4 digits entered");

    await user.click(screen.getByRole("button", { name: "Delete last digit" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "1 of 4 digits entered");
  });

  it("redirects to / on correct PIN (1701 default)", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Digit 1" }));
    await user.click(screen.getByRole("button", { name: "Digit 7" }));
    await user.click(screen.getByRole("button", { name: "Digit 0" }));
    await user.click(screen.getByRole("button", { name: "Digit 1" }));

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });

  it("shows error on incorrect PIN", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Digit 0" }));
    await user.click(screen.getByRole("button", { name: "Digit 0" }));
    await user.click(screen.getByRole("button", { name: "Digit 0" }));
    await user.click(screen.getByRole("button", { name: "Digit 0" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Incorrect PIN");
    });
    // Digits should be cleared
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "0 of 4 digits entered");
  });

  it("supports keyboard digit entry", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    // Click a button to ensure focus is inside the container, then use keyboard
    await user.click(screen.getByRole("button", { name: "Digit 1" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "1 of 4 digits entered");
    // Type directly via keyboard on the focused button (keyDown bubbles to container)
    await user.keyboard("7");
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "2 of 4 digits entered");
  });

  it("supports keyboard backspace", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    // Enter digits via button clicks
    await user.click(screen.getByRole("button", { name: "Digit 1" }));
    await user.click(screen.getByRole("button", { name: "Digit 7" }));
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "2 of 4 digits entered");
    // Press Backspace — event bubbles from the focused button to the container
    await user.keyboard("{Backspace}");
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "1 of 4 digits entered");
  });

  it("works with a custom PIN", async () => {
    const customHash = await hashPin("9999");
    await db.settings.put({ key: SETTING_KEYS.PIN_HASH, value: customHash });
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Digit 9" }));
    await user.click(screen.getByRole("button", { name: "Digit 9" }));
    await user.click(screen.getByRole("button", { name: "Digit 9" }));
    await user.click(screen.getByRole("button", { name: "Digit 9" }));

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });

  it("has accessible PIN pad group", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    expect(screen.getByRole("group", { name: "PIN pad" })).toBeInTheDocument();
  });

  it("all buttons meet minimum tap target size (44px)", async () => {
    await ensureDefaultPin(db);
    renderPin();
    await screen.findByRole("heading", { name: "Enter PIN" });
    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      const style = button.style;
      const minHeight = parseInt(style.minHeight || "0");
      const minWidth = parseInt(style.minWidth || "0");
      expect(minHeight).toBeGreaterThanOrEqual(44);
      expect(minWidth).toBeGreaterThanOrEqual(44);
    }
  });
});
