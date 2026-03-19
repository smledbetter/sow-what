import { describe, it, expect } from "vitest";
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

function renderRoute(path: string) {
  const routes = [
    { path: "/", element: <Home /> },
    { path: "/pin", element: <Pin /> },
    { path: "/planted", element: <Planted /> },
    { path: "/planted/:id", element: <PlantingDetail /> },
    { path: "/seeds", element: <Seeds /> },
    { path: "/seeds/:id", element: <SeedDetail /> },
    { path: "/weather", element: <Weather /> },
    { path: "/settings", element: <Settings /> },
  ];

  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("route shells", () => {
  it("renders Home at /", () => {
    renderRoute("/");
    expect(screen.getByText("Sow What")).toBeInTheDocument();
  });

  it("renders Pin at /pin", () => {
    renderRoute("/pin");
    expect(screen.getByText("Enter PIN")).toBeInTheDocument();
  });

  it("renders Planted at /planted", () => {
    renderRoute("/planted");
    expect(screen.getByText("Planted")).toBeInTheDocument();
  });

  it("renders PlantingDetail at /planted/:id", () => {
    renderRoute("/planted/42");
    expect(screen.getByText("Planting #42")).toBeInTheDocument();
  });

  it("renders Seeds at /seeds", async () => {
    renderRoute("/seeds");
    expect(await screen.findByText("Seed Inventory")).toBeInTheDocument();
  });

  it("renders SeedDetail at /seeds/:id", async () => {
    renderRoute("/seeds/7");
    // Non-existent seed shows not found
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

describe("App component", () => {
  it("renders without crashing", () => {
    render(<App />);
    expect(screen.getByText("Sow What")).toBeInTheDocument();
  });
});
