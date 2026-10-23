# Dynamic SRS maintenance map

This is a Vue 3 application using strict TypeScript ES modules and webpack. Install dependencies with `npm ci` on Node.js 24 or newer. `npm start` launches the webpack development server; `npm run build` creates the static site in ignored `dist/`. `src/html/index.html` is the HTML template and `src/app/app.ts` is the bundle entry. Vue includes the runtime compiler for existing inline templates; Bootstrap is imported only for isolated overlays. `npm run typecheck` checks browser and Node TypeScript without emitting files. `webpack.config.mts` owns bundling, HTML, CSS, print assets, and deployment base paths. See `docs/architecture.md` for the runtime contract.

Before changing code, use `docs/change-routing.md` to identify the smallest relevant file set. Do not scan every schema for a feature-local request.

For any application UI or styling change, read `docs/design.md` first. Dynamic SRS uses a Fluent 2-inspired native CSS system: keep semantic visual values in `src/styles/tokens.css`, shared component primitives in `base.css`, app chrome in `shell.css`, structural document/phase/stage hierarchy in `workspace-layout.css`, and cross-feature form/content presentation in `fluent-workspace.css`. Feature styles may extend those tokens but must not introduce a competing palette, typography system, control geometry, or Bootstrap-default visual language. Bootstrap remains available for layout utilities and isolated overlays, not as the product's design system.

For any AI prompt, schema, or copy-control change, read `docs/ai-prompts.md`, the authoritative app-wide AI contract:

- Full-tab guided interviews gather missing information naturally across every applicable section, existing record, and nested child before handing off to scoped form prompts. Include the complete current-tab schema and eligible inventory/current values without truncation. Omit earlier connected-project evidence; reuse reliable available conversation/memory for that context.
- Ordinary form prompts return exactly one versioned `dsrs-form` v1 JSON response scoped to the section/group/record/nested item, with precise field keys, saved IDs and selected evidence. Paste/validate/apply uses the shared controller and merge-only importer. Do not interview, ask follow-up questions, or replace unchanged values. Notes still uses its audited manual editing flow until a history-aware importer exists.
- Put copy buttons on sections, groups, records and nested items, never on every individual input. Item prompts include all their applicable fields.
- Preserve IDs, stage filters, read-only/automatic context and optionality. Interviews resolve consequential unknowns; scoped form JSON never contains a separate missing-information list. Unsupported values are null or omitted so existing values survive the merge. Never import read-only fields, Notes revisions through a generic merge, or diagram payloads through `dsrs-form`. Human guides/tooltips are never AI instructions.
- Remove contradictory older guidance when changing the workflow instead of appending competing instructions. Feature guidance adds domain knowledge, not a separate AI contract.

The canonical application semantic version lives in `src/core/application-version.ts`. Read `docs/app-version.md` whenever a change alters supported functionality, saved-data compatibility, or user-visible presentation, and apply the required version bump in the same change. While the application remains unfinished, retain the `-alpha` prerelease suffix unless the user explicitly promotes it. Documentation-only changes, internal refactors, TypeScript/build/deployment work, and other behavior-preserving infrastructure changes do not bump the application version by themselves. Workspace `FORMAT_VERSION` is independent and must be evaluated separately when the `.dsrs` file contract changes.

For SRS work, consult `docs/srs-construction-workflow.md` for the state and preview contracts. Phase 1 previews have explicit mappings separate from form schemas; keep substantive form answers represented when editing either side. Other guides are on-demand references, not required reading for every change.

Phase 2 uses schema-based preview placement and shared perspective, actor, goal, and use-case records. Extend those records in later phases instead of creating duplicate catalogs; see the workflow guide for exact paths.

Phase 3 extends the same use cases, with shared relationships, figures, requirements, and the existing issue register. Stored diagram payloads stay in saved data and never enter AI prompts. Ordinary prompts receive metadata only. A repeatable diagram section prompt requests one ordered `dsrs-diagrams` batch that preserves established figure partitions and compact metadata; an individual figure prompt requests one `dsrs-diagram` semantic graph and replaces only that figure's file. The app validates the complete batch before record creation and owns all layout/DrawIO generation; see docs/ai-diagrams.md. Stage record filters must agree across forms, previews, completion, and prompts without deleting stored records.

Phase 4 keeps functional, quality, and interface obligations in `records.requirements`; use `requirement-records.ts` for their kind filters and ID namespaces. Constraints and assumptions enrich existing scope decisions. See the workflow guide before extending these records or assembling later previews.

Phase 5 consists of four implemented model-validation stages under `features/software-requirements/phase-five/`. New domain concepts use the sole `records.domainConcepts` catalog (`SRS-DOM-*`); all model figures use existing `records.artifacts` (`FIG-*`) with group filters. Reuse actors, use cases, requirements, terms and SRS-ISS issues instead of cloning them. New domain/interaction/state/UI semantic diagram types live in `core/artifacts/diagram-model.ts` and use the existing DrawIO pipeline. Form, preview, record reviews and AI import must continue to agree on figure groups and saved references.

Phase 6 derives coverage/traceability from saved canonical IDs, not a manually authored matrix. The `phase-six/traceability.ts` selector owns derived rows and review findings; `ReconciliationStageForm` and `ReconciliationStagePreview` consume it without storing the report. Phase 6 edits the original SRS-ISS issue register and existing requirement acceptance/verification fields. Optional Step 06.5 is an implemented, sectionless custom form that downloads the complete uncompressed workspace JSON and produces a `dsrs-cleanup` v2 changes-only patch. Its prompt in `phase-six/ai-cleanup.ts` prioritizes comprehensive rewriting and removal of verbose or duplicate content over exceptional evidence-backed additions; there is no arbitrary patch-count cap. The validator permits add/replace/remove within canonical SRS records and Phase 1–6 stage data, checks the full saved content fingerprint, and stages changes on a clone before a selected atomic apply. The UI reports approximate prose size and distinct expansion/reduction classifications, and preselects nothing. `AiCleanupStageForm.ts` owns the user review/undo flow and the navigation renderer explicitly displays this custom form despite empty schema sections. Keep `dsrs-form` imports separate. This stage is optional and excluded from completion and final document output; do not silently mutate Phase 7 or unrelated planning documents. Plans do not constitute executed or passing tests, statuses remain human-controlled, and Phase 7 implements controlled final assembly.

Phase 7 lives in `phase-seven/`. `assembly-model.ts` projects a single final SRS from canonical saved records and stage fields in outline order; never concatenate partial previews or save derived traceability tables. Preserve stable FIG/requirement/issue IDs, attached diagrams, auditable draft/deferred/excluded dispositions, embedded supporting source text or an explicit exclusion, and human-only release approval. `AssemblyStageForm` and `AssemblyStagePreview` own readiness and full-document presentation. Build verification cannot establish visually correct figures or approval.

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

Every pushed commit is automatically checked by `.github/workflows/verify-build.yml` using Node.js 24, `npm ci`, strict TypeScript checking, and a production webpack build. Prefer the GitHub Actions result for compile verification; do not create ad hoc verification workflows or rerun builds just to check compilation. Other verification remains manual at the user's request: do not run additional tests, local builds, browser checks, or automation unless explicitly asked. Provide a focused manual checklist when handing off changes.

Whenever creating or amending a Git commit, preserve the user's existing author/committer identity and include `Co-authored-by: Codex <noreply@openai.com>` as a commit-message trailer.
