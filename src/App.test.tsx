import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { App } from "./App.tsx";
import { Home } from "./pages/Home.tsx";
import { Pin } from "./pages/Pin.tsx";
import { Planted } from "./pages/Planted.tsx";
import { Seeds } from "./pages/Seeds.tsx";
import { Weather } from "./pages/Weather.tsx";
import { Settings } from "./pages/Settings.tsx";
import { SeedDetail } from "./pages/SeedDetail.tsx";
import { PlantingDetail } from "./pages/PlantingDetail.tsx";
import { AuthGate } from "./components/AuthGate.tsx";
import { setAuthenticated } from "./utils/pin.ts";

function renderRoute(path: string) {
  const routes = [
    { path: "/pin", element: <Pin /> },
    { path: "/", element: <AuthGate><Home /></AuthGate> },
    { path: "/planted", element: <AuthGate><Planted /></AuthGate> },
    { path: "/planted/:id", element: <AuthGate><PlantingDetail /></AuthGate> },
    { path: "/seeds", element: <AuthGate><Seeds /></AuthGate> },
    { path: "/seeds/:id", element: <AuthGate><SeedDetail /></AuthGate> },
    { path: "/weather", element: <AuthGate><Weather /></AuthGate> },
    { path: "/settings", element: <AuthGate><Settings /></AuthGate> },
  ];

  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  setAuthenticated(true);
});

describe("route shells (authenticated)", () => {
  it("renders Home at /", () => {
    renderRoute("/");
    expect(screen.getByText("Sow What")).toBeInTheDocument();
  });

  it("renders Planted at /planted", () => {
    renderRoute("/planted");
    expect(screen.getByRole("heading", { name: "Planted" })).toBeInTheDocument();
  });

  it("renders PlantingDetail at /planted/:id", async () => {
    renderRoute("/planted/42");
    expect(await screen.findByText("Planting Not Found")).toBeInTheDocument();
  });

  it("renders Seeds at /seeds", async () => {
    renderRoute("/seeds");
    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();
  });

  it("renders SeedDetail at /seeds/:id", async () => {
    renderRoute("/seeds/7");
    expect(await screen.findByText("Seed not found")).toBeInTheDocument();
  });

  it("renders Weather at /weather", () => {
    renderRoute("/weather");
    expect(screen.getByText("Weather")).toBeInTheDocument();
  });

  it("renders Settings at /settings", () => {
    renderRoute("/settings");
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});

describe("route shells (unauthenticated)", () => {
  beforeEach(() => {
    setAuthenticated(false);
  });

  it("renders Pin at /pin (always accessible)", async () => {
    renderRoute("/pin");
    expect(await screen.findByRole("heading", { name: "Enter PIN" })).toBeInTheDocument();
  });

  it("redirects / to /pin when not authenticated", async () => {
    renderRoute("/");
    expect(await screen.findByRole("heading", { name: "Enter PIN" })).toBeInTheDocument();
  });

  it("redirects /seeds to /pin when not authenticated", async () => {
    renderRoute("/seeds");
    expect(await screen.findByRole("heading", { name: "Enter PIN" })).toBeInTheDocument();
  });

  it("redirects /settings to /pin when not authenticated", async () => {
    renderRoute("/settings");
    expect(await screen.findByRole("heading", { name: "Enter PIN" })).toBeInTheDocument();
  });
});

describe("App component", () => {
  it("renders without crashing", () => {
    render(<App />);
    // When not authenticated, should redirect to PIN
    // App renders its own router, so we can't set auth easily
    // Just verify no crash
    expect(document.body).toBeInTheDocument();
  });
});
