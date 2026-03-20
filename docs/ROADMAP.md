# Sow What — Roadmap

## Current State
- **Tests**: 286 unit/component + 28 E2E = 314 total
- **Coverage**: 94.40% statements, 86.62% branches
- **LOC**: ~8208
- **Milestone**: Sprint 8 complete -- ALL PHASES DONE

## Phases

### Phase 1: Project Scaffold + Data Layer (Sprint 1) -- DONE
- [x] Vite + React + TypeScript project init
- [x] Vitest + React Testing Library + coverage config
- [x] `fake-indexeddb` in Vitest setupFiles (required for Dexie in tests)
- [x] Playwright setup: config with `vite preview` webServer, mobile viewport (375x812)
- [x] vite-plugin-pwa setup (manifest, service worker)
- [x] React Router with route shells for all screens
- [x] Dexie.js database: schema for seeds, plantings, weatherSnapshots, settings
- [x] TypeScript interfaces for all data model types
- [x] Seed data access layer (CRUD functions) with unit tests
- [x] Smoke E2E test: app loads, routes navigate
- **Done**: all 5 gates pass; 39 tests + 6 E2E; 95.91% coverage

### Phase 2: Seed Inventory (Sprint 2) -- DONE
- [x] Seed list view (`/seeds`) — display all seeds, search/filter
- [x] Seed detail/edit view (`/seeds/:id`) — add, edit, delete
- [x] CSV import (parse CSV → bulk insert into Dexie)
- [x] CSV export (Dexie → downloadable CSV)
- [x] Mobile-friendly form inputs (large tap targets, minimal typing)
- **Done**: all 5 gates pass; 79 tests + 8 E2E; 95.51% coverage

### Phase 3: Daily Checklists (Sprint 3) -- DONE
- [x] Fuzzy date parser (maps "Late Feb", "Early March", compound ranges → concrete date windows)
- [x] Checklist query: filter seeds whose sow window includes today
- [x] Home screen (`/`) with Cold Sow / Direct Sow tabs
- [x] Each item shows: plant name, varietal, soil temp range
- [x] Tap to check off (visual strike-through, toggleable)
- **Done**: all 5 gates pass; 130 tests + 11 E2E; 94.28% coverage

### Phase 4: Planting Flow (Sprint 4) -- DONE
- [x] Check-off creates a planting record in Dexie
- [x] Auto-capture weather snapshot on plant (stub for now — hardcoded or Open-Meteo if ready)
- [x] Planting detail view (`/planted/:id`) — edit bed location, germination date, harvest date
- [x] Uncheck removes planting record (or marks as undone)
- **Done**: all 5 gates pass; 159 tests + 11 E2E; 94.52% coverage

### Phase 5: Planted List (Sprint 5) -- DONE
- [x] Planted list view (`/planted`) — all plantings with details
- [x] Sort by date planted, plant name, method
- [x] Filter by sow method (cold sow / direct sow)
- [x] Show weather conditions inline
- [x] E2E: full planting journey (add seed → checklist → check off → appears in planted list)
- **Done**: all 5 gates pass; 173 tests + 14 E2E; 94.05% coverage

### Phase 6: Weather Integration (Sprint 6) -- DONE
- [x] Open-Meteo client: fetch current conditions + 7-day forecast
- [x] Cache weather data in Dexie for offline access
- [x] Weather view (`/weather`) — current conditions + forecast + frost alerts
- [x] Auto-capture real weather on planting (replace Sprint 4 stub)
- [x] Frost warning: highlight days where forecast temp <= 32F
- **Done**: all 5 gates pass; 225 tests + 19 E2E; 94.28% coverage

### Phase 7: PIN Auth + Settings (Sprint 7) -- DONE
- [x] PIN entry screen (`/pin`) — numeric pad
- [x] PIN stored (hashed) in Dexie settings
- [x] Session gate: redirect to `/pin` if not authenticated
- [x] Settings screen (`/settings`) — change PIN, set frost dates, set season year
- [x] Data export from settings (CSV download)
- **Done**: all 5 gates pass; 275 tests + 21 E2E; 95.19% coverage

### Phase 8: Polish + Offline Hardening (Sprint 8) -- DONE
- [x] PWA manifest tuning (icons, theme color, splash)
- [x] Service worker: verify full offline capability (all routes, all assets)
- [x] UI polish: loading states, empty states, error messages
- [x] Touch UX audit: tap target sizes (min 44px), one-handed reachability
- [x] Edge cases: first-run experience (no seeds, no PIN set), season rollover
- [x] E2E: offline test (disconnect network via Playwright context, verify app loads + data persists)
- [x] E2E: PIN flow (enter PIN → unlock → navigate → refresh → PIN required again)
- **Done**: all 5 gates pass; 286 tests + 28 E2E; 94.40% coverage; full offline support verified
