import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { bootstrapSeeds } from "./db/bootstrap.ts";

const root = document.getElementById("root");
if (root) {
  // Render immediately — don't block on bootstrap
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  // Bootstrap seeds in background (non-blocking)
  bootstrapSeeds().catch(() => {});
}
