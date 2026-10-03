# Dynamic SRS maintenance map

This is a browser-native Vue 3 application. It has no application build step: `src/html/index.html` loads Vue and Bootstrap globals, then starts the application through `src/app/app.js` as a native ES module. Use `npm start` to serve it locally through the zero-dependency Node server.

Before changing code, use `docs/change-routing.md` to identify the smallest relevant file set. Do not scan every schema for a feature-local request.

For SRS work, consult `docs/srs-construction-workflow.md` for the state and preview contracts. Phase 1 previews have explicit mappings separate from form schemas; keep substantive form answers represented when editing either side. Other guides are on-demand references, not required reading for every change.

Phase 2 uses schema-based preview placement and shared perspective, actor, goal, and use-case records. Extend those records in later phases instead of creating duplicate catalogs; see the workflow guide for exact paths.

Phase 3 extends the same use cases, with shared relationships, figures, requirements, and the existing issue register. Diagram payloads stay in saved data; AI prompts receive metadata only. Stage record filters must agree across forms, previews, completion, and prompts without deleting stored records.

Phase 4 keeps functional, quality, and interface obligations in `records.requirements`; use `requirement-records.js` for their kind filters and ID namespaces. Constraints and assumptions enrich existing scope decisions. See the workflow guide before extending these records or assembling later previews.

Architectural invariants:

- `src/core` is feature-neutral and must never import from `src/features`.
- `src/components` contains reusable Vue renderers and may import only from `core` or other generic components.
- `src/features` owns document vocabulary, specialized calculations, and specialized components.
- `src/app` coordinates features and browser-level workflows.
- Feature schemas are declarative data. Do not add DOM operations or Vue behavior to them.
- Add a feature to `src/features/feature-registry.js`; do not create new global `Srs*` namespaces.
- Keep Vue as the owner of application state. Bootstrap JavaScript is limited to isolated UI overlays such as tooltips and popovers.
- Do not add jQuery; modern DOM APIs and Vue cover its former responsibilities.
- Preserve the `.dsrs` format through the workspace validation/migration boundary.

Prefer focused modules below 400 lines. Split a schema by section when it grows beyond roughly 500 lines.

Verification is manual at the user's request. Do not run builds, tests, browser checks, or other automated checks unless the user later requests them. Provide a focused manual checklist when handing off changes.
