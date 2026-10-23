# Architecture — document workspace foundation

Dynamic SRS remains a frontend-only application. The redesign now has a fixed document navigation catalog and separate views for each named document, with a structured Client Requirements brief but no AI orchestration or diagram tools.

- `src/app/app.ts` — application header, modal document-navigation drawer and animated hamburger trigger, URL-hash document navigation, and workspace status.
- `src/app/document-sidebar.ts` — animated modal drawer, navigation among the seven document areas, and workspace-wide backup tools.
- `src/features/documents/catalog.ts` — stable IDs, acronyms, names, and descriptions for CR, SR, CBA, FSA, SRS, EB, and GN.
- `src/features/documents/document-view.ts` — shared document headers with a slot for implemented content; other documents still have empty states.
- `src/features/client-requirements/model.ts` — typed and validated CR source, AI-draft, and interview-note records, plus file and AI handoff helpers.
- `src/features/client-requirements/client-requirements.ts` — CR intake, source viewing, optional AI handoff and interview notes.
- `src/app/theme.ts`, `theme-menu.ts`, `theme-picker.ts` — preference and appearance controls.
- `src/components/popup-dialog.ts`, `use-dialog.ts` — modal dialog primitives, including workspace restore review.
- `src/styles/` — semantic design tokens and responsive application/document/sidebar styles.
- `src/core/data/indexeddb.ts` — browser-local record storage, revision checks, staged restore, and cross-tab notifications.
- `src/core/workspace/dsrs-format.ts` — portable versioned .dsrs validation/serialization.
- `src/app/workspace.ts`, `workspace-files.ts` — storage integration and sidebar backup/restore controls.
- `webpack.config.mts` — static build with a development server.

The seven document identities are application navigation, **not persisted document records**. CR stores one structured `cr.brief` record plus optional immutable `cr.source` references in the existing workspace record collection; simply visiting a document does not create records. The remaining documents do not have domain schemas yet. Historical records from the earlier CR implementation remain in backups but are not surfaced by the new editor. The brief is deliberately limited to client-expressed information; neither GN interviews nor detailed SRS requirements are modeled here.

Dependency layering is app -> features/components/core, features -> components/core, components -> core, core -> core. Avoid upward/cyclic dependencies and abstractions without real consumers.
