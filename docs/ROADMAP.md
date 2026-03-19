# Sow What — Roadmap

## Current State
- **Tests**: 130 unit/component + 11 E2E = 141 total
- **Coverage**: 94.28% statements, 91.23% branches
- **LOC**: 3552
- **Milestone**: Sprint 3 complete -- Planting Flow next

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

### Phase 4: Planting Flow (Sprint 4)
- [ ] Check-off creates a planting record in Dexie
- [ ] Auto-capture weather snapshot on plant (stub for now — hardcoded or Open-Meteo if ready)
- [ ] Planting detail view (`/planted/:id`) — edit bed location, germination date, harvest date
- [ ] Uncheck removes planting record (or marks as undone)
- **Done when**: checking a seed creates a planting with weather snapshot; detail view allows editing all fields; tests pass

### Phase 5: Planted List (Sprint 5)
- [ ] Planted list view (`/planted`) — all plantings with details
- [ ] Sort by date planted, plant name, method
- [ ] Filter by sow method (cold sow / direct sow)
- [ ] Show weather conditions inline
- [ ] E2E: full planting journey (add seed → checklist → check off → appears in planted list)
- **Done when**: planted list displays all records with correct data; sorting and filtering work; E2E planting journey passes; tests pass

### Phase 6: Weather Integration (Sprint 6)
- [ ] Open-Meteo client: fetch current conditions + 7-day forecast
- [ ] Cache weather data in Dexie for offline access
- [ ] Weather view (`/weather`) — current conditions + forecast + frost alerts
- [ ] Auto-capture real weather on planting (replace Sprint 4 stub)
- [ ] Frost warning: highlight days where forecast temp <= 32F
- **Done when**: weather fetches and displays correctly; offline falls back to cache; frost alerts surface; planting records get real weather; tests pass

### Phase 7: PIN Auth + Settings (Sprint 7)
- [ ] PIN entry screen (`/pin`) — numeric pad
- [ ] PIN stored (hashed) in Dexie settings
- [ ] Session gate: redirect to `/pin` if not authenticated
- [ ] Settings screen (`/settings`) — change PIN, set frost dates, set season year
- [ ] Data export from settings (CSV download)
- **Done when**: app requires PIN on load; PIN can be set/changed; frost dates are configurable and used by checklist logic; tests pass

### Phase 8: Polish + Offline Hardening (Sprint 8)
- [ ] PWA manifest tuning (icons, theme color, splash)
- [ ] Service worker: verify full offline capability (all routes, all assets)
- [ ] UI polish: loading states, empty states, error messages
- [ ] Touch UX audit: tap target sizes (min 44px), one-handed reachability
- [ ] Performance audit: Lighthouse PWA score
- [ ] Edge cases: first-run experience (no seeds, no PIN set), season rollover
- [ ] E2E: offline test (disconnect network via Playwright context, verify app loads + data persists)
- [ ] E2E: PIN flow (enter PIN → unlock → navigate → refresh → PIN required again)
- **Done when**: Lighthouse PWA score >= 90; all routes work offline; E2E offline + PIN tests pass; touch targets meet spec; edge cases handled; all gates pass
