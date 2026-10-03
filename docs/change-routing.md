# Change routing

Read the smallest matching file set first.

For CR/SR/CBA/FSA authoring, start with `docs/planning-simplification.md` and the specific feature schema or section. CBA input sections live in `features/cost-benefit-analysis/sections/`; financial prompt context lives in `financial-evidence.js`.

For SRS authoring 0.3.0, start with `docs/srs-simplification.md` and `features/software-requirements/simplification/{field-policy,stages}.js`. These define the active reduced forms; original phase schemas retain legacy descriptors.

| Request | Primary files | Read shared code only if needed |
|---|---|---|
| Add, remove, or rename a field | Relevant `src/features/*/schema.js` or feasibility section | `core/schema/state-factory.js` |
| Add a new page/feature | New `src/features/<feature>` and `features/feature-registry.js` | Generic components if existing field types are insufficient |
| Change field rendering | `components/fields/SchemaField.js` | `styles/forms.css` |
| Change parent/context grouping | `core/records/parent-records.js`, `components/forms/{RelatedRecordGroups,RelatedRecordItem}.js` | Feature `repeatable.parent`; `docs/record-relationships.md` for the relationship inventory |
| Change repeatable forms | `components/forms/FormWorkspace.js` | `core/schema/state-factory.js`, `record-values.js` |
| Change conditional visibility | `core/schema/field-visibility.js` | Relevant schema |
| Change completion calculation | `core/schema/form-completion.js` | Relevant schema completion flags |
| Change AI prompts | `core/ai/prompt-builder.js`, `core/ai/prompt-contract.js`, `core/ai/evidence-context.js` | Relevant schema `ai` guidance/definitions; `features/software-requirements/workflow/{prompt-tasks,prompt-definitions}.js` for SRS interviews |
| Change CBA formulas | `features/cost-benefit-analysis/calculations.js` | CBA schema |
| Change CBA chart | `features/cost-benefit-analysis/chart-model.js`, `CbaSummary.js` | `styles/cba.css` |
| Change CBA document | `features/cost-benefit-analysis/CbaPreview.js` | `styles/preview.css` |
| Change Notes behavior | `features/notes/NotesComponents.js`, `note-model.js` | Notes schema and `styles/notes.css` |
| Change generic preview | `components/preview/DocumentPreview.js` | `styles/preview.css` |
| Change SRS construction phases or stages | `features/software-requirements/workflow/phases.js` | `features/software-requirements/schema.js` |
| Change Phase 1 questions or guidance | Matching `features/software-requirements/phase-one/{evidence-intake,specification-frame,scope-baseline,vocabulary-baseline}.js` | `docs/srs-construction-workflow.md` for state and preview contracts |
| Change Phase 1 preview content | `features/software-requirements/phase-one/preview-model.js` | `preview-support.js` for mappings; `BaselineStagePreview.js` for metadata; generic preview only for rendering defects |
| Change Phase 2 questions or prompts | Matching `features/software-requirements/phase-two/{stakeholder-perspectives,actors-goals,candidate-processes}.js` | `phase-two/evidence.js` for source context |
| Change actor-first goal editing | `features/software-requirements/phase-two/{ActorsGoalsForm,ActorGoalEditor}.js` | `actors-goals.js` for fields; shared collections and previews remain canonical |
| Change Phase 2 coverage hints | `features/software-requirements/phase-two/discovery-review.js`, `DiscoveryStageForm.js` | Stage schemas for field names |
| Change Phase 3 forms or guidance | Matching `features/software-requirements/phase-three/{catalog,descriptions,diagrams,requirements}.js` | `shared.js` for declarative schema helpers, `evidence.js` for clipboard/source context |
| Change Phase 3 consistency hints | `features/software-requirements/phase-three/behavior-review.js`, `BehaviorStageForm.js` | `components/references/RecordReviewPanel.js` |
| Change Phase 4 forms, placement, or prompts | `features/software-requirements/phase-four/{context,attributes,interfaces}.js` | `shared.js` for schema builders; `evidence.js` for connected sources |
| Change Phase 4 consistency hints | `features/software-requirements/phase-four/quality-review.js`, `QualityStageForm.js` | Shared `RecordReviewPanel.js` |
| Change shared requirement wording/verification fields | `features/software-requirements/requirement-fields.js` | Phase 3 `requirements.js`, Phase 4 `shared.js` for placement and specialized fields |
| Change unresolved-question handoffs | `features/software-requirements/{issue-follow-up,follow-through-review}.js` | Phase 1 issue schema and explicit preview; Phase 3/4 review consumers |
| Change SRS reference checks | `features/software-requirements/record-review.js` | Phase-specific reviews for relationship semantics |
| Change Phase 4 review outcome consistency | `features/software-requirements/phase-four/review-outcomes.js` | `quality-review.js` |
| Plan remaining SRS phases or review course alignment | `docs/srs-phase-three-four-review.md` | `docs/srs-construction-workflow.md`, relevant stage only |
| Verify SRS Phase 3/4 handoffs | `tests/srs-handoffs.test.mjs` | Run with `node --test`; no application build step |
| Change requirement kinds, IDs, or filters | `features/software-requirements/requirement-records.js` | Phase 3 functional and Phase 4 quality/interface schemas; keep saved IDs and the single collection |
| Change diagram upload or replacement | `components/diagrams/DiagramUploadControl.js`, `DiagramFileField.js`, `core/artifacts/diagram-files.js` | `components/forms/FormWorkspace.js` for batch record creation |
| Change diagram rendering/printing | `components/diagrams/DiagramMedia.js`, `DrawioDiagramPreview.js`, `core/printing/print-media.js` | `styles/diagram-artifacts.css`, `core/printing/print-document.js` |
| Change shared-record stage filtering | `core/schema/section-records.js` | Form, preview, completion, and AI consumers; never filter saved state |
| Change schema-placed previews (Phase 2 onward) | `core/schema/placed-preview.js`, `components/preview/PlacedStagePreview.js` | Section `documentTarget`, `documentSubsection`, `previewTitle`; generic preview only for rendering |
| Change live record selectors | `core/records/reference-fields.js` | `components/forms/FormWorkspace.js`; feature `field.reference` descriptors |
| Change connected evidence references | `components/references/WorkspaceEvidencePanel.js` | `features/software-requirements/phase-one/evidence.js`, `styles/workspace-evidence.css` |
| Change the finished SRS outline or placement | `features/software-requirements/document-outline.js` | `core/schema/schema-tree.js`, generic preview |
| Change generic nested navigation | `components/navigation/SubpageWorkspace.js` | `styles/navigation.css` |
| Change application header/tabs | `src/html/index.html`, `styles/shell.css`, `styles/navigation.css` | `app/app.js` |
| Change autosave or workspace status | `app/autosave-controller.js`, `app/app.js` | `core/workspace/workspace-storage.js` |
| Change `.dsrs` structure | `core/workspace/workspace-format.js` | validation and normalization |
| Change import/download | `core/workspace/workspace-files.js` | validation and normalization |
| Change printing behavior | `app/print-controller.js`, `core/printing/print-document.js` | `styles/responsive-print.css` |
| Change human guides or helper tips | `features/planning/help-content.js`, `features/software-requirements/simplification/help-content.js`; Notes/EB schemas | `components/forms/PageGuide.js`, `components/controls/FormControls.js`, `core/bootstrap/overlay-directives.js`; AI instructions stay separate |

Search schemas by stable IDs or field keys rather than reading every schema. Shared schema vocabulary is in `core/schema/shared-options.js`.

Paths above are relative to `src/` unless they start with `src/` or `docs/`. Start with the matching row; expand to shared code only when the local implementation points there. Read `architecture.md` for dependency changes and `schema-reference.md` for unfamiliar schema properties, rather than loading every guide for routine edits.
