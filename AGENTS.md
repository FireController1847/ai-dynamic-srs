# Agent maintenance instructions

## Status and scope
- This branch is a **blank-slate Dynamic SRS redesign**. Do not resurrect the previous Dynamic SRS architecture from `main`, or copy Dynamic Learner's study features, unless asked.
- Dynamic Learner is the **tooling and visual-convention reference**, not the product specification. Product workflows, SRS data models, AI orchestration and compatibility contracts are intentionally undecided.
- Keep `README.md` human-facing; do not use it as a task log, agent memory, or QA diary. Update it only when user-visible facts change.

## Build and code
- Node.js 24+, `npm ci`, `npm start` (webpack-dev-server), `npm run typecheck`, `npm run build` (ignored `dist/`).
- Use strict TypeScript ES modules and plain Vue 3 components, as in Dynamic Learner; do not introduce Vue SFC compilation or another framework without a specific decision.
- Keep source organized by responsibility. Put application composition in `src/app`, visual styles in `src/styles`; introduce `core`, `components`, or `features` only when a real use case needs them.
- Once those layers exist, dependency direction is app -> features/components/core, features -> components/core, components -> core, core -> core. Avoid circular/upward dependencies and abstractions created for hypothetical future consumers.
- Treat all future imported, persisted, or AI-produced data as `unknown` until validated. Do not weaken TS strictness with blanket `any` or `@ts-nocheck`.
- Avoid arbitrary caps and duplicate sources of truth. Preserve explicit ownership, IDs, and boundaries when those are eventually designed.
- Make focused changes; do not re-create planning flows, prompts, domain schemas, or diagrams before requirements are settled. Preserve the established IndexedDB and .dsrs boundaries; see `docs/workspace-data.md`.

## UX, verification, and delivery
- Read `docs/workspace-data.md` for persistence, imports, schema evolution, backups, and conflict-handling changes.
- Follow `docs/design.md` for the Fluent-style visual baseline: reusable semantic tokens, accessible controls, keyboard support, responsive sizing, dark theme, reduced-motion respect.
- `docs/architecture.md` records the current *minimal* structure, not a future blueprint. Amend it only for actual decisions.
- `.github/workflows/verify-build.yml` verifies type checking/build on pushes. Do not invent additional test suites or run browser automation unless requested; prefer focused manual verification.
- `.github/workflows/deploy-pages.yml` is manual. Do not commit `dist/` or deploy automatically.
- Work on the branch requested by the user. Never merge or modify `main` without an explicit request.
