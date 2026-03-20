import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { bootstrapSeeds } from "./db/bootstrap.ts";

bootstrapSeeds().then(() => {
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  }
});
