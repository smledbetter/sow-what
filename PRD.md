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

- All data stored locally on device
- App is fully functional without network connectivity
- Weather data syncs when online; uses last-cached data when offline
- No account creation or cloud dependency

### 6. PIN Authentication

- Simple PIN entry on app launch
- No account system — single user, local data

## Tech Stack

### Frontend
- **React Native** (Expo) — cross-platform mobile with a single codebase
- Minimal, tap-friendly UI optimized for outdoor / one-handed use

### Data Layer
- **SQLite** (via expo-sqlite) — local-first, no server dependency
- Schema supports seeds, plantings, weather snapshots, and user settings

### Weather API
- **Open-Meteo** — free, no API key required, supports forecast and historical data
- Cached locally for offline resilience

### Build & Deploy
- **Expo EAS** — build and distribute to iOS (primary target)
- OTA updates via Expo for quick iterations

## Data Model (High-Level)

### seeds
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PK |
| plant | TEXT | e.g., "Lettuce" |
| varietal | TEXT | e.g., "Forellenschluss" |
| seed_or_start | TEXT | "Seed" or "Start" |
| purchased | BOOLEAN | |
| cold_sow_start | DATE | Start of cold sow window |
| cold_sow_end | DATE | End of cold sow window |
| direct_sow_start | DATE | Start of direct sow window |
| direct_sow_end | DATE | End of direct sow window |
| soil_temp_min | INTEGER | Degrees F |
| soil_temp_max | INTEGER | Degrees F |
| notes | TEXT | |

### plantings
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PK |
| seed_id | INTEGER | FK to seeds |
| method | TEXT | "cold_sow" or "direct_sow" |
| date_planted | DATE | |
| bed_location | TEXT | User-entered |
| germination_date | DATE | User-entered when observed |
| expected_harvest | DATE | User-entered or calculated |
| weather_snapshot_id | INTEGER | FK to weather_snapshots |

### weather_snapshots
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PK |
| date | DATE | |
| temp_high | REAL | Degrees F |
| temp_low | REAL | Degrees F |
| precipitation | REAL | Inches |
| conditions | TEXT | e.g., "Partly cloudy" |
| raw_json | TEXT | Full API response for reference |

### settings
| Column | Type | Notes |
|---|---|---|
| key | TEXT | PK |
| value | TEXT | JSON-encoded |

Keys: `pin`, `last_frost`, `first_frost`, `season_year`

## Screen Map

1. **PIN Entry** — numeric pad, unlock to home
2. **Home — Cold Sow tab** — today's cold sow checklist
3. **Home — Direct Sow tab** — today's direct sow checklist
4. **Planted List** — all plantings with details, sortable/filterable
5. **Planting Detail** — edit bed location, germination date, harvest date
6. **Seed Inventory** — full seed list, add/edit/delete
7. **Seed Detail / Edit** — single seed form
8. **Weather / Forecast** — current conditions + 7-day forecast with frost alerts
9. **Settings** — PIN, frost dates, export data

## Success Criteria

- Open the app on any given day and know within 5 seconds what needs planting
- Complete a planting check-off in under 3 taps
- Works fully offline in the garden
- All planting history preserved with weather context for season review
