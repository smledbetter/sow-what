import { createBrowserRouter } from "react-router-dom";
import { Home } from "./pages/Home.tsx";
import { Planted } from "./pages/Planted.tsx";
import { PlantingDetail } from "./pages/PlantingDetail.tsx";
import { Seeds } from "./pages/Seeds.tsx";
import { SeedDetail } from "./pages/SeedDetail.tsx";
import { Weather } from "./pages/Weather.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Pin } from "./pages/Pin.tsx";
import { AuthGate } from "./components/AuthGate.tsx";

export const router = createBrowserRouter([
  { path: "/pin", element: <Pin /> },
  { path: "/", element: <AuthGate><Home /></AuthGate> },
  { path: "/planted", element: <AuthGate><Planted /></AuthGate> },
  { path: "/planted/:id", element: <AuthGate><PlantingDetail /></AuthGate> },
  { path: "/seeds", element: <AuthGate><Seeds /></AuthGate> },
  { path: "/seeds/:id", element: <AuthGate><SeedDetail /></AuthGate> },
  { path: "/weather", element: <AuthGate><Weather /></AuthGate> },
  { path: "/settings", element: <AuthGate><Settings /></AuthGate> },
]);
