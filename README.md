# Sow What

A mobile-first, local-first gardening companion that tells you exactly what to plant today. Open the app, see your checklist, get it in the ground, and move on.

No calendar math, no cloud accounts — just a clear answer to "what should I sow today?"

## What It Does

- **Daily checklists** — shows which seeds are in their planting window right now, split by Cold Sow and Direct Sow methods
- **Planting log** — records what you planted, when, and what the weather was like
- **Seed inventory** — manage your seed collection with sowing windows and soil temp ranges
- **Weather integration** — frost alerts and 7-day forecast via Open-Meteo (free, no API key)
- **Works offline** — PWA with service worker; loads and functions fully without network after first visit
- **PIN lock** — simple PIN entry to keep things private

## Stack

- **Vite + React 19 + TypeScript** — mobile-first SPA
- **Dexie.js** (IndexedDB) — all data stays on your device, no server
- **vite-plugin-pwa + Workbox** — offline-first with precached assets
- **Open-Meteo** — free weather API, no key required
- **Vitest + React Testing Library** — unit and component tests
- **Playwright** — 28 E2E tests on mobile viewport

## Development

```bash
npm install
npm run dev          # dev server
npm run build        # production build
npm run test         # unit + component tests
npm run test:e2e     # Playwright E2E tests
npm run lint         # ESLint
```

## Deploy

Static SPA — deploy the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, etc.).

```bash
npm run build
```

## License

MIT
