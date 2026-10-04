# Dynamic SRS maintenance map

This is a Vue 3 application using strict TypeScript ES modules and webpack. Install dependencies with `npm ci` on Node.js 24 or newer. `npm start` launches the webpack development server; `npm run build` creates the static site in ignored `dist/`. `src/html/index.html` is the HTML template and `src/app/app.ts` is the bundle entry. Vue includes the runtime compiler for existing inline templates; Bootstrap is imported only for isolated overlays. `npm run typecheck` checks browser and Node TypeScript without emitting files. `webpack.config.mts` owns bundling, HTML, CSS, print assets, and deployment base paths. See `docs/architecture.md` for the runtime contract.

Before changing code, use `docs/change-routing.md` to identify the smallest relevant file set. Do not scan every schema for a feature-local request.

The canonical application semantic version lives in `src/core/application-version.ts`. Read `docs/app-version.md` whenever a change alters supported functionality, saved-data compatibility, or user-visible presentation, and apply the required version bump in the same change. While the application remains unfinished, retain the `-alpha` prerelease suffix unless the user explicitly promotes it. Documentation-only changes, internal refactors, TypeScript/build/deployment work, and other behavior-preserving infrastructure changes do not bump the application version by themselves. Workspace `FORMAT_VERSION` is independent and must be evaluated separately when the `.dsrs` file contract changes.

For SRS work, consult `docs/srs-construction-workflow.md` for the state and preview contracts. Phase 1 previews have explicit mappings separate from form schemas; keep substantive form answers represented when editing either side. Other guides are on-demand references, not required reading for every change.

Phase 2 uses schema-based preview placement and shared perspective, actor, goal, and use-case records. Extend those records in later phases instead of creating duplicate catalogs; see the workflow guide for exact paths.

Phase 3 extends the same use cases, with shared relationships, figures, requirements, and the existing issue register. Diagram payloads stay in saved data; AI prompts receive metadata only. Stage record filters must agree across forms, previews, completion, and prompts without deleting stored records.

Phase 4 keeps functional, quality, and interface obligations in `records.requirements`; use `requirement-records.ts` for their kind filters and ID namespaces. Constraints and assumptions enrich existing scope decisions. See the workflow guide before extending these records or assembling later previews.

Architectural invariants:

TypeScript invariants:

- Keep strictness enabled; accept untrusted workspace/import data as `unknown` and narrow it through runtime guards.
- Do not use `@ts-nocheck`, blanket `any`, or weakened compiler settings to claim a migration is complete.
- Use explicit `.ts`/`.mts` imports and erasable TypeScript syntax so Node.js 24 can execute build tooling directly.

- `src/core` is feature-neutral and must never import from `src/features`.
- `src/components` contains reusable Vue renderers and may import only from `core` or other generic components.
- `src/features` owns document vocabulary, specialized calculations, and specialized components.
- `src/app` coordinates features and browser-level workflows.
- Feature schemas are declarative data. Do not add DOM operations or Vue behavior to them.
- Add a feature to `src/features/feature-registry.ts`; do not create new global `Srs*` namespaces.
- Keep Vue as the owner of application state. Bootstrap JavaScript is limited to isolated UI overlays such as tooltips and popovers.
- Do not add jQuery; modern DOM APIs and Vue cover its former responsibilities.
- Preserve the `.dsrs` format through the workspace validation/migration boundary.

Prefer focused modules below 400 lines. Split a schema by section when it grows beyond roughly 500 lines.

Verification is manual at the user's request. Do not run builds, tests, browser checks, or other automated checks unless the user later requests them. Provide a focused manual checklist when handing off changes.
