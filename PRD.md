# Sow What — Product Requirements Document

## Vision

A mobile-first, local-first gardening companion that tells you exactly what to plant today. Open the app, see your checklist, get it in the ground, and move on. No fuss, no calendar math — just a clear answer to "what should I sow today?"

## Unique Value Proposition

Most planting calendars are static references you have to interpret yourself. Sow What is a **living checklist** that combines your seed inventory, your local frost dates, and today's date to surface exactly what's actionable right now — then records what you planted, when, and what the weather was like.

## Users

- Single user, secured with PIN authentication
- Primary use: phone in the garden, likely with dirty hands — UI must be tap-friendly and minimal

## Core Concepts

### Two Sowing Methods

- **Cold Sow** — winter sowing in containers outdoors, done weeks before last frost
- **Direct Sow** — planting seeds directly into the ground after conditions allow

### Date Interpretation

The planting calendar uses fuzzy date ranges. The app maps these to concrete windows:

| Label | Date Range |
|---|---|
| Late Feb | Feb 20-28 |
| Early March | March 1-10 |
| Mid March | March 11-20 |
| Late March | March 21-31 |
| Early April | April 1-10 |
| (Specific dates like "Apr 20-27") | Used as-is |
| (Compound like "Late Feb-Early March") | Feb 20 - March 10 |

Seeds appear on the checklist when today falls within their sowing window.

### Frost Dates (CT defaults)

- **Last frost:** May 18
- **First frost:** September 30

These should be configurable per user/season.

## Features

### 1. Daily Checklists (Home Screen)

Two tabs: **Cold Sow** and **Direct Sow**

- On load, shows seeds whose sowing window includes today
- Each item displays: Plant name, Varietal, Ideal soil temp range
- Tap to check off — item stays visible but struck through (tap again to uncheck)
- Checked items move to the Planted list with:
  - Date planted
  - Current weather conditions (temp high/low, precipitation) auto-captured
  - Sow method (cold sow or direct sow)

### 2. Planted List

A record of everything that's gone into the ground:

- Plant name & varietal
- Date planted
- Sow method
- Weather on planting day (high/low temp, precipitation)
- Location / bed number (user-entered)
- Germination date (user-entered, when observed)
- Expected harvest date (user-entered or calculated from seed data if available)

### 3. Seed Inventory

Full list of seeds in the database:

- Plant, Varietal, Purchased (yes/no), Cold Sow date range, Direct Sow date range, Soil temp range
- Ability to add, edit, and remove seeds
- Initial data imported from CSV; the app database is the source of truth going forward
- Export capability (CSV/Google Sheets compatible) for season planning

### 4. Weather Integration

- **On plant day:** Auto-capture current conditions (temp, precipitation) and store with the planted record
- **Forecast view:** Surface frost warnings and relevant forecasts (e.g., "Frost expected in 3 days")
- Weather data cached for offline access (last fetch)

### 5. Offline / Local-First

- All data stored in IndexedDB via Dexie.js — no server, no cloud
- PWA service worker (vite-plugin-pwa + Workbox) precaches all app assets
- App loads and functions fully without network after first visit
- Weather data syncs when online; uses last-cached data when offline
- Installable to home screen on iOS and Android via PWA manifest

### 6. PIN Authentication

- Simple PIN entry on app launch
- No account system — single user, local data

## Tech Stack

### Frontend
- **Vite + React + TypeScript** — mobile-first PWA, pure SPA (no SSR)
- Minimal, tap-friendly UI optimized for outdoor / one-handed use
- Installable to home screen via PWA manifest

### Data Layer
- **Dexie.js** (IndexedDB) — local-first, no server dependency
- Stores seeds, plantings, weather snapshots, and user settings
- Simple, mature library (used by WhatsApp Web, Microsoft To Do)

### Offline / PWA
- **vite-plugin-pwa** + Workbox — service worker precaches all assets
- App loads instantly after first visit, even without network
- Weather data cached locally; syncs when online

### Weather API
- **Open-Meteo** — free, no API key required, supports forecast and historical data

### Testing
- **Vitest** + **React Testing Library** — native Vite integration, fast, Jest-compatible
- Coverage via Vitest's built-in v8 provider

### Build & Deploy
- Static files served from VPS (or any static host)
- No app store, no Apple Developer account required
- OTA updates by deploying new static build

## Data Model (High-Level)

All data stored in IndexedDB via Dexie.js. IDs are auto-incrementing. Dates stored as ISO strings (YYYY-MM-DD).

### seeds
| Field | Type | Notes |
|---|---|---|
| id? | number | Auto-increment PK |
| plant | string | e.g., "Lettuce" |
| varietal | string | e.g., "Forellenschluss" |
| seedOrStart | string | "Seed" or "Start" |
| purchased | boolean | |
| coldSowStart | string | Start of cold sow window (ISO date) |
| coldSowEnd | string | End of cold sow window (ISO date) |
| directSowStart | string | Start of direct sow window (ISO date) |
| directSowEnd | string | End of direct sow window (ISO date) |
| soilTempMin | number | Degrees F |
| soilTempMax | number | Degrees F |
| notes | string | |

### plantings
| Field | Type | Notes |
|---|---|---|
| id? | number | Auto-increment PK |
| seedId | number | Reference to seeds |
| method | string | "cold_sow" or "direct_sow" |
| datePlanted | string | ISO date |
| bedLocation | string | User-entered |
| germinationDate | string | User-entered when observed |
| expectedHarvest | string | User-entered or calculated |
| weatherSnapshotId | number | Reference to weather_snapshots |

### weatherSnapshots
| Field | Type | Notes |
|---|---|---|
| id? | number | Auto-increment PK |
| date | string | ISO date |
| tempHigh | number | Degrees F |
| tempLow | number | Degrees F |
| precipitation | number | Inches |
| conditions | string | e.g., "Partly cloudy" |
| rawJson | string | Full API response for reference |

### settings
| Field | Type | Notes |
|---|---|---|
| key | string | PK (explicit, not auto-increment) |
| value | string | JSON-encoded |

Keys: `pin`, `last_frost`, `first_frost`, `season_year`

## Screen Map

Client-side routing (e.g., React Router). All views are SPA routes — no server round-trips.

1. **`/pin`** — PIN Entry — numeric pad, unlock to home
2. **`/`** — Home — Cold Sow tab (default) and Direct Sow tab — today's checklists
3. **`/planted`** — Planted List — all plantings with details, sortable/filterable
4. **`/planted/:id`** — Planting Detail — edit bed location, germination date, harvest date
5. **`/seeds`** — Seed Inventory — full seed list, add/edit/delete
6. **`/seeds/:id`** — Seed Detail / Edit — single seed form
7. **`/weather`** — Weather / Forecast — current conditions + 7-day forecast with frost alerts
8. **`/settings`** — Settings — PIN, frost dates, export data

## Success Criteria

- Open the app on any given day and know within 5 seconds what needs planting
- Complete a planting check-off in under 3 taps
- Works fully offline in the garden
- All planting history preserved with weather context for season review
