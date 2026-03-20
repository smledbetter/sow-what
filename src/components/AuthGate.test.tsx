import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AuthGate } from "./AuthGate.tsx";
import { setAuthenticated } from "../utils/pin.ts";

function renderWithAuth(authenticated: boolean, initialPath = "/") {
  setAuthenticated(authenticated);
  const routes = [
    {
      path: "/",
      element: (
        <AuthGate>
          <div>Protected Content</div>
        </AuthGate>
      ),
    },
    { path: "/pin", element: <div>PIN Screen</div> },
  ];
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  return render(<RouterProvider router={router} />);
}

beforeEach(() => {
  setAuthenticated(false);
});

describe("AuthGate", () => {
  it("redirects to /pin when not authenticated", () => {
    renderWithAuth(false);
    expect(screen.getByText("PIN Screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    renderWithAuth(true);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
    expect(screen.queryByText("PIN Screen")).not.toBeInTheDocument();
  });
});
