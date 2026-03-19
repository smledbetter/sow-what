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

- `echo 'TODO: build/typecheck command'`
- `echo 'TODO: lint command'`
- `echo 'TODO: test command'`
- `echo 'TODO: coverage command'`
<!-- TODO: Gate commands are placeholders. Sprint 0 will verify and update these. -->

## Conventions

- Start each sprint in a fresh session. One sprint = one session.


<!-- TODO: Sprint 0 fills in language-specific conventions below:
  - Language, framework, test runner
  - Lint rules and coverage floors
  - Coding standards specific to this stack
  - Any constraints from the PRD
  - Known issues and gotchas
-->
