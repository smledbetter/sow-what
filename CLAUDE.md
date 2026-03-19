# Sow What

A mobile-first, local-first gardening companion that tells you exactly what to plant today. Open the app, see your checklist, get it in the ground, and move on. No fuss, no calendar math — just a clear answer to "what should I sow today?"

## Workflow

- Start each sprint in a fresh session. One sprint = one session.
- Sprint workflow auto-loads from `.claude/skills/flowstate/SKILL.md`.
- Run `/gate` after every meaningful change.
- When Phase 1+2 gates pass, run `/sprint-ship N` for Phase 3.
- Use Plan mode first. Iterate until the plan is solid, then switch to auto-accept for implementation.
- Use subagents only for parallel independent work (3+ files, zero overlap). Implement in the main session.

## Quality Gates

Run with `/gate`. Commands are in `~/.flowstate/sow-what/flowstate.config.md`.

- `npx tsc --noEmit`
- `npx eslint .`
- `npx vitest run`
- `npx vitest run --coverage`

## Conventions

- Start each sprint in a fresh session. One sprint = one session.

### Stack
- **Language**: TypeScript (strict mode)
- **Framework**: Vite + React 19
- **Data**: Dexie.js (IndexedDB) — local-first, no server
- **Routing**: React Router
- **Offline**: vite-plugin-pwa + Workbox
- **Weather**: Open-Meteo (free, no API key)
- **Testing**: Vitest + React Testing Library + @testing-library/user-event
- **Coverage**: v8 via Vitest — floor: 90% statements, 85% branches

### Coding Standards
- All files TypeScript (`.ts` / `.tsx`), strict mode enabled
- camelCase for fields and variables, PascalCase for components and types
- Dates stored as ISO strings (`YYYY-MM-DD`), never Date objects in the DB
- No `any` types — use `unknown` + type guards when type is genuinely unknown
- Prefer named exports over default exports
- Keep components small: if a component exceeds ~150 lines, extract sub-components
- All Dexie DB access goes through a data access layer (`src/db/`), not directly from components

### UI Constraints (from PRD)
- Mobile-first: design for 375px width, scale up
- Tap targets minimum 44x44px (dirty hands in the garden)
- Minimal typing — prefer select/toggle over text input where possible
- Large, readable text — outdoor visibility matters

### Known Issues / Gotchas
- iOS Safari can evict PWA IndexedDB storage after ~7 days of non-use (mitigated by regular use)
- Service worker updates require refresh — use `prompt` update strategy in vite-plugin-pwa
- Dexie.js does not enforce foreign keys — reference integrity is app-level responsibility
