# Change routing

Read the smallest matching file set first.

For CR/SR/CBA/FSA authoring, start with `docs/planning-simplification.md` and the specific feature schema or section. CBA input sections live in `features/cost-benefit-analysis/sections/`; financial prompt context lives in `financial-evidence.ts`.

For SRS authoring, start with `docs/srs-simplification.md` and `features/software-requirements/simplification/{field-policy,stages}.ts`. These define the active reduced forms; original phase schemas retain legacy descriptors.

For any AI workflow change, read `docs/ai-prompts.md` first. It is the authoritative contract for full-tab discovery and scoped form formatting across every feature and specialized editor.

| Request | Primary files | Read shared code only if needed |
|---|---|---|
| Change application semantic version or its fixed label | `core/application-version.ts`, `src/html/index.html`, `styles/shell.css`, `docs/app-version.md` | `core/workspace/workspace-format.ts` consumes the canonical version for saved metadata; update `AGENTS.md` only when policy changes |
| Change webpack, npm scripts, deployment base, or emitted assets | `webpack.config.mts`, `package.json`, `package-lock.json`, `src/html/index.html` | `src/app/app.ts` for CSS/runtime imports; `core/printing/print-document.ts` for copied iframe assets; `docs/architecture.md` |
| Add, remove, or rename a field | Relevant `src/features/*/schema.ts` or feasibility section | `core/schema/state-factory.ts` |
| Add a new page/feature | New `src/features/<feature>` and `features/feature-registry.ts` | Generic components if existing field types are insufficient |
| Change field rendering | `components/fields/SchemaField.ts` | `styles/forms.css` |
| Change parent/context grouping | `core/records/parent-records.ts`, `components/forms/{RelatedRecordGroups,RelatedRecordItem}.ts` | Feature `repeatable.parent`; `docs/record-relationships.md` for the relationship inventory |
| Change repeatable forms | `components/forms/FormWorkspace.ts` | `core/schema/state-factory.ts`, `record-values.ts` |
| Change conditional visibility | `core/schema/field-visibility.ts` | Relevant schema |
| Change completion calculation | `core/schema/form-completion.ts` | Relevant schema completion flags |
| Change AI prompts or recursive form contracts | `core/ai/{interview-prompt,form-prompt,prompt-schema,prompt-builder,prompt-contract}.ts` | `docs/ai-prompts.md`, `docs/guided-interviews.md`; relevant schema `ai` guidance/definitions; `core/ai/evidence-context.ts` for form evidence only; SRS `workflow/{prompt-tasks,prompt-definitions}.ts`; CBA `financial-evidence.ts` for form financial context |
| Change scoped AI copy controls | `components/controls/FormControls.ts`, `components/fields/SchemaField.ts` | Generic form/group/record editors, specialized feature editor only when used; pass complete scope through the shared builder rather than a custom prompt template |
| Change CBA formulas | `features/cost-benefit-analysis/calculations.ts` | CBA schema |
| Change CBA chart | `features/cost-benefit-analysis/chart-model.ts`, `CbaSummary.ts` | `styles/cba.css` |
| Change CBA document | `features/cost-benefit-analysis/CbaPreview.ts` | `styles/preview.css` |
| Change Notes behavior | `features/notes/NotesComponents.ts`, `note-model.ts` | Notes schema and `styles/notes.css` |
| Change generic preview | `components/preview/DocumentPreview.ts` | `styles/preview.css` |
| Change SRS construction phases or stages | `features/software-requirements/workflow/phases.ts` | `features/software-requirements/schema.ts` |
| Change Phase 1 questions or guidance | Matching `features/software-requirements/phase-one/{evidence-intake,specification-frame,scope-baseline,vocabulary-baseline}.ts` | `docs/srs-construction-workflow.md` for state and preview contracts |
| Change Phase 1 preview content | `features/software-requirements/phase-one/preview-model.ts` | `preview-support.ts` for mappings; `BaselineStagePreview.ts` for metadata; generic preview only for rendering defects |
| Change Phase 2 questions or prompts | Matching `features/software-requirements/phase-two/{stakeholder-perspectives,actors-goals,candidate-processes}.ts` | `phase-two/evidence.ts` for source context |
| Change actor-first goal editing | `features/software-requirements/phase-two/{ActorsGoalsForm,ActorGoalEditor}.ts` | `actors-goals.ts` for fields; shared collections and previews remain canonical |
| Change Phase 2 coverage hints | `features/software-requirements/phase-two/discovery-review.ts`, `DiscoveryStageForm.ts` | Stage schemas for field names |
| Change Phase 3 forms or guidance | Matching `features/software-requirements/phase-three/{catalog,descriptions,diagrams,requirements}.ts` | `shared.ts` for declarative schema helpers, `evidence.ts` for clipboard/source context |
| Change Phase 3 consistency hints | `features/software-requirements/phase-three/behavior-review.ts`, `BehaviorStageForm.ts` | `components/references/RecordReviewPanel.ts` |
| Change Phase 4 forms, placement, or prompts | `features/software-requirements/phase-four/{context,attributes,interfaces}.ts` | `shared.ts` for schema builders; `evidence.ts` for connected sources |
| Change Phase 4 consistency hints | `features/software-requirements/phase-four/quality-review.ts`, `QualityStageForm.ts` | Shared `RecordReviewPanel.ts` |
| Change shared requirement wording/verification fields | `features/software-requirements/requirement-fields.ts` | Phase 3 `requirements.ts`, Phase 4 `shared.ts` for placement and specialized fields |
| Change unresolved-question handoffs | `features/software-requirements/{issue-follow-up,follow-through-review}.ts` | Phase 1 issue schema and explicit preview; Phase 3/4 review consumers |
| Change SRS reference checks | `features/software-requirements/record-review.ts` | Phase-specific reviews for relationship semantics |
| Change Phase 4 review outcome consistency | `features/software-requirements/phase-four/review-outcomes.ts` | `quality-review.ts` |
| Plan remaining SRS phases or review course alignment | `docs/srs-phase-three-four-review.md` | `docs/srs-construction-workflow.md`, relevant stage only |
| Verify SRS Phase 3/4 handoffs | `tests/srs-handoffs.test.mjs` | Run with `node --test` only when requested; these checks import source modules directly |
| Change requirement kinds, IDs, or filters | `features/software-requirements/requirement-records.ts` | Phase 3 functional and Phase 4 quality/interface schemas; keep saved IDs and the single collection |
| Change diagram upload or replacement | `components/diagrams/DiagramUploadControl.ts`, `DiagramFileField.ts`, `core/artifacts/diagram-files.ts` | `components/forms/FormWorkspace.ts` for batch record creation |
| Change diagram rendering/printing | `components/diagrams/DiagramMedia.ts`, `DrawioDiagramPreview.ts`, `core/printing/print-media.ts` | `styles/diagram-artifacts.css`, `core/printing/print-document.ts` |
| Change shared-record stage filtering | `core/schema/section-records.ts` | Form, preview, completion, and AI consumers; never filter saved state |
| Change schema-placed previews (Phase 2 onward) | `core/schema/placed-preview.ts`, `components/preview/PlacedStagePreview.ts` | Section `documentTarget`, `documentSubsection`, `previewTitle`; generic preview only for rendering |
| Change live record selectors | `core/records/reference-fields.ts` | `components/forms/FormWorkspace.ts`; feature `field.reference` descriptors |
| Change connected evidence references or earlier-answer views | `core/evidence/evidence-model.ts`, `components/references/WorkspaceEvidencePanel.ts` | `core/ai/evidence-context.ts` shares the resolver; relevant feature evidence descriptors, `styles/workspace-evidence.css`, `docs/connected-evidence.md` |
| Change the finished SRS outline or placement | `features/software-requirements/document-outline.ts` | `core/schema/schema-tree.ts`, generic preview |
| Change generic nested navigation | `components/navigation/SubpageWorkspace.ts` | `styles/navigation.css` |
| Change application header/tabs | `src/html/index.html`, `styles/shell.css`, `styles/navigation.css` | `app/app.ts` |
| Change autosave or workspace status | `app/autosave-controller.ts`, `app/app.ts` | `core/workspace/workspace-storage.ts` |
| Change `.dsrs` structure | `core/workspace/workspace-format.ts` | validation and normalization |
| Change import/download | `core/workspace/workspace-files.ts` | validation and normalization |
| Change printing behavior | `app/print-controller.ts`, `core/printing/print-document.ts` | `styles/responsive-print.css` |
| Change human guides or helper tips | `features/planning/help-content.ts`, `features/software-requirements/simplification/help-content.ts`; Notes/EB schemas | `components/forms/PageGuide.ts`, `components/controls/FormControls.ts`, `core/bootstrap/overlay-directives.ts`; AI instructions stay separate |

Search schemas by stable IDs or field keys rather than reading every schema. Shared schema vocabulary is in `core/schema/shared-options.ts`.

Paths above are relative to `src/` unless they start with `src/` or `docs/`. Start with the matching row; expand to shared code only when the local implementation points there. Read `architecture.md` for dependency changes and `schema-reference.md` for unfamiliar schema properties, rather than loading every guide for routine edits.
