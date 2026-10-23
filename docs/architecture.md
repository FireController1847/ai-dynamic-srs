# Architecture — document workspace foundation

Dynamic SRS remains a frontend-only application. The redesign now has a fixed document navigation catalog and separate views for each named document, with structured Client Requirements and System Request editors but no AI orchestration or diagram tools.

- `src/app/app.ts` — application header, modal document-navigation drawer and animated hamburger trigger, URL-hash document navigation, and workspace status.
- `src/app/document-sidebar.ts` — animated modal drawer, navigation among the seven document areas, and workspace-wide backup tools.
- `src/features/documents/catalog.ts` — stable IDs, acronyms, names, and descriptions for CR, SR, CBA, FSA, SRS, EB, and GN.
- `src/features/documents/document-view.ts` — shared document headers with a slot for implemented content; CBA, FSA, SRS, EB and GN still have empty states.
- `src/features/client-requirements/model.ts` — validated CR brief and original-source records, with stable-ID capability and boundary lists.
- `src/features/client-requirements/client-requirements.ts` — CR structured editing, original client materials, and preview.
- `src/features/system-request/model.ts` — validated `sr.request` initiation record, business requirement/benefit entries, stable IDs and ordering.
- `src/features/system-request/use-system-request.ts` — SR IndexedDB autosave, revision checks and navigation flush.
- `src/features/system-request/system-request.ts` — five-section SR editor, benefit categorization, document metadata and live paper preview.
- `src/app/theme.ts`, `theme-menu.ts`, `theme-picker.ts` — preference and appearance controls.
- `src/components/popup-dialog.ts`, `use-dialog.ts` — modal dialog primitives, including workspace restore review.
- `src/styles/` — semantic design tokens and responsive application/document/sidebar styles.
- `src/core/data/indexeddb.ts` — browser-local record storage, revision checks, staged restore, and cross-tab notifications.
- `src/core/workspace/dsrs-format.ts` — portable versioned .dsrs validation/serialization.
- `src/app/workspace.ts`, `workspace-files.ts` — storage integration and sidebar backup/restore controls.
- `webpack.config.mts` — static build with a development server.

The seven document identities are application navigation, **not persisted document records**. CR stores one structured `cr.brief` record plus optional immutable `cr.source` references in the existing workspace record collection; simply visiting a document does not create records. SR stores one validated `sr.request` record with ID `main`; CR, SR, CBA, and GN are not interchangeable sources of truth. SR does not automatically copy or infer values from CR/GN, and neither document edits the other's records. CBA, FSA, SRS, EB and GN do not have domain schemas yet. Historical records from the earlier CR implementation remain in backups but are not surfaced by the new editor. The brief is deliberately limited to client-expressed information; neither GN interviews nor detailed SRS requirements are modeled here.

Dependency layering is app -> features/components/core, features -> components/core, components -> core, core -> core. Avoid upward/cyclic dependencies and abstractions without real consumers.
