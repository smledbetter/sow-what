import { createBrowserRouter } from "react-router-dom";
import { Home } from "./pages/Home.tsx";
import { Planted } from "./pages/Planted.tsx";
import { PlantingDetail } from "./pages/PlantingDetail.tsx";
import { Seeds } from "./pages/Seeds.tsx";
import { SeedDetail } from "./pages/SeedDetail.tsx";
import { Weather } from "./pages/Weather.tsx";
import { Settings } from "./pages/Settings.tsx";
import { Pin } from "./pages/Pin.tsx";

export const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/pin", element: <Pin /> },
  { path: "/planted", element: <Planted /> },
  { path: "/planted/:id", element: <PlantingDetail /> },
  { path: "/seeds", element: <Seeds /> },
  { path: "/seeds/:id", element: <SeedDetail /> },
  { path: "/weather", element: <Weather /> },
  { path: "/settings", element: <Settings /> },
]);
