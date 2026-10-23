# Architecture — blank-slate baseline

Dynamic SRS currently has **only a frontend scaffold**. It deliberately has no SRS domain schema, document model, AI agents, prompt protocol, diagrams, or feature registry. The IndexedDB/.dsrs foundation is domain-neutral.

- `src/app/app.ts` — one Vue 3 root component, theme settings trigger, and workspace backup controls.
- `src/app/theme.ts`, `theme-menu.ts`, `theme-picker.ts` — shared theme registry, preferences, system appearance tracking, and settings UI.
- `src/components/popup-dialog.ts`, `use-dialog.ts` — accessible modal dialog primitives.
- `src/styles/` — shared semantic color/spacing tokens, theme palettes, accessible controls, and application-shell styles.
- `src/core/data/indexeddb.ts` — browser-local record storage, revision checks, staged restore and cross-tab notifications.
- `src/core/workspace/dsrs-format.ts` — portable versioned .dsrs validation/serialization, independent of database schema.
- `src/app/workspace.ts`, `workspace-files.ts` — Vue adapter and backup/restore UI.
- `src/html/index.html` — base HTML for the static site.
- `webpack.config.mts` — one webpack entry, live development server, and GitHub Pages-compatible static build.
- `tsconfig*.json` — strict browser/build tool checking.
- `.github/workflows/` — push verification and manual Pages deployment.

Dependency layering is local to this repository: `app` may import `features`/`components`/`core`; `features` may import `components`/`core`; `components` may import `core`; `core` imports `core` only. Avoid upward or cyclic dependencies. Add `src/features` only when actual SRS product features exist, and share implementation only where multiple real callers warrant it. This structure does not imply any particular SRS workflow; future product architecture needs explicit design decisions.
