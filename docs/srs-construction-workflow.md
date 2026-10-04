# SRS construction workflow

> [SRS simplification](srs-simplification.md) defines the active forms and completion rules, superseding the older review questionnaires, repeated catalog, and required metadata described below. [AI prompt contract](ai-prompts.md) defines all current AI behavior. The canonical record and document-placement contracts below still apply.

The SRS workspace has two deliberately separate structures:

1. `features/software-requirements/workflow/phases.ts` defines the order in which an analyst builds and checks the specification.
2. `features/software-requirements/document-outline.ts` defines the order in which accepted results appear in the finished document.

Workflow order must never be used as finished-document numbering. A workflow stage can contribute to more than one document section through `documentTargets`, and several stages can refine the same target.

## Workflow contract

Each phase and stage has a stable `id`, a persistence `stateKey`, and optional workflow metadata:

```js
workflow: {
  kind: "phase" | "stage",
  required: true,
  role: "establish" | "discover" | "elaborate" | "specify" | "validate" | "reconcile" | "assemble",
  sequence: 1,
  dependsOn: ["prior-node-id"],
  reviews: ["earlier-phase-id"]
}
```

Dependencies communicate construction order; they do not lock tabs. Reviews identify earlier work that the current phase is expected to challenge.

Required workflow stages remain incomplete while they are structure-only placeholders, preventing a partially implemented phase from appearing finished.

Phase 1 contains Evidence Intake, Specification Frame, Scope Baseline, and Vocabulary Baseline. Evidence panels start collapsed and show current source sections, counts of recorded answers, and links to the originating forms. Each populated section can expand to read the earlier answers and stable record IDs. These are live read-only views, not copied saved records. UI, clipboard evidence, and baseline source availability share `core/evidence/evidence-model.ts`; see `connected-evidence.md`.

Leaf stages may declare finished-document destinations separately:

```js
documentTargets: ["functional-behavior.requirements"]
```

The generic nested workspace resolves those keys against the root document outline. Future partial previews should use that placement rather than navigation indexes.

## Phase 1 maintenance contract

All paths here are under `src/features/software-requirements/` unless otherwise specified.

| Concern | Owner |
|---|---|
| Questions, help, completion flags, AI guidance | Matching stage schema in `phase-one/` |
| Source sections available to each stage | `phase-one/evidence.ts` |
| Form answers and source records placed into preview sections | `phase-one/preview-model.ts` |
| Numbering, source lookup, populated-record filtering, scope disposition helpers | `phase-one/preview-support.ts` |
| Partial-document metadata and renderer props | `phase-one/BaselineStagePreview.ts` |

The preview uses its own explicit field mapping; adding a form field does **not** automatically add it to the preview. Every substantive SRS answer must appear in its stage preview unless the form explicitly identifies it as workflow-only. Keep user wording intact. Include review notes, decision authorities, and populated evidence issues (including resolved issues and their resolutions). Filter untouched or retired records, not incomplete authored records. Prior-document references may remain concise.

| Stage | Preview placement |
|---|---|
| Evidence Intake | References: baseline answers, source register, evidence issues; Appendices and Prior Analysis |
| Specification Frame | Purpose and Audience; Intended Audiences; Product Perspective |
| Scope Baseline | Project Scope; Scope Decisions; Product Features |
| Vocabulary Baseline | Terms and Definitions; Vocabulary Review |

Stage scalar answers live in the nested stage `dataModel`; shared collections live in `documentModel.softwareRequirementsSpecification.records`. The preview builder flattens those inputs into a temporary display model without modifying saved data. Source references are live, not snapshots. Confirmed Include/Exclude/Defer decisions referencing an `SR-BR-*` ID control the corresponding carried feature; proposed decisions remain visible but do not change feature placement.

## Phase 2 implementation and handoff

Phase 2 is implemented under `phase-two/`: `stakeholder-perspectives.ts`, `actors-goals.ts`, and `candidate-processes.ts`. It follows Chapter 4's sequence: review the subject boundary, identify external roles and goals, identify major processes, then check coverage and sizing. The template's user classes and Sunland's role/outcome descriptions inform the level of detail; their project-specific facts are examples, not defaults.

| Stage | Canonical records | Document placement |
|---|---|---|
| Stakeholder Perspectives | `records.perspectives` (`SRS-VPT-*`) | 2.3 User Classes and Characteristics |
| Actors & Goals | `records.actors` (`SRS-ACT-*`), `records.goals` (`SRS-GOL-*`) | 3.1 Actors and Goals |
| Candidate Processes | `records.useCases` (`SRS-UC-*`) | 3.2 Use-Case Model |

Collections are under `softwareRequirementsSpecification`; scalar reviews remain in the existing `actorGoalDiscovery` stage states. Normalization supplies the new collections without dropping undeclared saved keys. Phase 3 must enrich `records.useCases` and retain its IDs, not copy candidates into a second catalog. Deferred/excluded records retain their disposition; removal retires records through the existing stable-ID behavior.

Phase 2 uses the generic `components/forms/EvidenceForm.ts` (also re-exported as the Phase 1 form) and `components/preview/PlacedStagePreview.ts`. Each section declares `documentTarget`, optional `documentSubsection`, and optional `previewTitle`. `core/schema/placed-preview.ts` carries every field into a temporary preview model and filters only untouched/retired records. No second field whitelist is needed. Existing Phase 1 explicit previews remain separate.

Actor selectors use declarative `field.reference` descriptors (`dataPath`, `displayId`, `labelField`). They save an ID, show its current label, and retain unavailable references until corrected. Multi-record references remain comma-separated IDs. `DiscoveryStageForm.ts` provides a compact ID index and advisory checks from `discovery-review.ts`: missing/retired links, unrepresented interacting perspectives, actor/goal mismatches, unresolved scope, and uncovered in-scope goals. These checks do not modify data, certify approval, or affect the existing one-third array completion rule.

`phase-two/evidence.ts` supplies source navigation and form-prompt evidence. `ai.includeSiblingContext` supplies populated neighboring records as form context (for example, actors when formatting goals). Tab interviews include the complete current-stage schema and eligible record inventory/current values so all applicable entries are covered; earlier connected-source evidence is omitted. UI evidence collapse state never limits clipboard context. The shared `ai-prompts.md` contract owns discovery, scope, and answer behavior.

Phase 2 records review findings and links; it does not silently approve scope changes.

### Actors & Goals editing

`phase-two/ActorsGoalsForm.ts` is the specialized form for this tab only. It renders each actor with its goals underneath; `ActorGoalEditor.ts` renders goal answers and an optional move-to-actor control. Generic components remain feature-neutral, and other tabs retain their existing forms.

The form writes directly to `records.actors` and `records.goals`. Adding a goal assigns its parent actor's stable display ID to `goal.actorId`; renaming the actor does not alter that link. Goals remain canonical records with their own stable IDs, so later use-case references, normalization, and document placement continue to use the existing catalogs. No nested saved goal copies or format migration are introduced.

Removing an actor retires only that actor. Authored goals with missing/retired parents appear in “Goals needing an actor,” where a name-based choice repairs the existing link. Goals of a role marked “Not an actor” remain visible with a warning and can be moved. Moving a goal preserves its ID and answers. Removing a goal retires it. New goals cannot be added under a role marked “Not an actor.”

The goal collection uses `minimum: 0` and `completionMinimum: 1`, avoiding a new unattached placeholder while preserving the stage's existing goal completion expectation. An untouched legacy placeholder is retained and reused on the next Add goal action. The automatically assigned actor field is not counted as a user-entered completion answer.

The tab interview retains existing actor links as read-only context and gathers missing information across every actor and goal without repeated Actor ID inputs. It hands off to the selected form copy control for final formatted answers. Per-actor goal copy prompts filter to that actor and treat its automatically managed link as context; individual goal/field prompts narrow further. The placed preview retains the canonical actor/goal sections and relationship references.

Manual verification (not run):

- Add two actors and a goal beneath each; confirm no Actor ID entry is required and each goal appears beneath the intended role.
- Rename an actor and move a goal by the actor-name selector; confirm the goal ID and its answers stay intact.
- Open an existing workspace with linked, unassigned, and retired-parent goals; confirm authored goals remain accessible and can be reassigned.
- Remove an actor with goals; confirm its goals appear in the recovery section rather than being deleted. Confirm “Not an actor” retains existing goals and prevents new ones.
- Copy the tab interview and one actor's goal prompt; confirm the interview covers every eligible actor/goal, the form prompt returns complete supported answers only for that actor's goals without follow-up questions, and neither asks for repeated actor-link entry.
- Save/reopen, inspect the preview, and open Candidate Processes; confirm stable goal references and saved relationships still resolve.


## Phase 3 implementation and handoff

`phase-three/stages.ts` registers all six stages in the existing workflow order. `shared.ts` builds declarative section descriptors; generic components own rendering and state interaction. The scope is guided by Chapter 4's use-case/activity modeling sequence, the Sunland casual/detailed descriptions, and the course template's requirement for labeled diagrams within the document.

| Stage | Shared content | Document placement |
|---|---|---|
| Use-Case Catalog | Existing `records.useCases`; `records.useCaseRelationships` (`SRS-REL-*`) | 3.2 Use-Case Model |
| Casual Descriptions | Preconditions, guarantees, short stories, and questions on the same use cases | 3.3.1 Casual Descriptions |
| Use-Case Map | `records.artifacts`, filtered to `use-case-map` | 3.2.3 Use-Case Figures |
| Activity Workflows | The same artifact register, filtered to `activity-workflow` | 6.1 Activity Models |
| Detailed Descriptions | Normal, subflow, alternative/exceptional paths and figure references on the same use cases | 3.3.2 Detailed Descriptions |
| Functional Requirements | `records.requirements` (`SRS-FR-*`); existing `records.evidenceIssues` (`SRS-ISS-*`) | 3.4 Functional Requirements; shared issues in 8.2.1 |

Catalog edits remain visible in Phase 2. Description stages cannot add or remove cases; they show active candidates and preserve deferred/excluded cases in the source catalog. Preconditions and guarantees are edited in place across descriptions. Flow text uses explicit numbered steps/path labels so requirements can cite them. Relationships store directed source/target IDs; diagram metadata does not create relationships automatically.

Figures use one `FIG-0001` sequence across the two diagram stages. Each artifact stores the file once in its `file` field, plus title, caption, covered IDs, and review findings. Batch uploads accept DrawIO/XML and PNG/JPEG; replacement preserves the record ID, and retirement preserves the payload and ID. Existing limits remain 2 MB per file and 3 MB across the shared register (including retired files). The official online diagrams.net viewer renders XML. Multi-page DrawIO files print the currently selected preview page; use separate figures when every page must be included. Printing waits for media and copies the rendered SVG rather than the interactive viewer/source XML.

`behavior-review.ts` checks recorded links, include/specialization cycles, missing stories/flows, figure references, and use-case/requirement coverage. It does not read meaning from a diagram or certify semantic correctness. `evidence.ts` provides prior-stage context; file metadata is summarized centrally and binary/XML contents are excluded from prompts.

Phase 4 must extend the shared records and traceability rather than copy these catalogs. Full SRS assembly remains Phase 7. The original Phase 3 implementation left runtime/browser/print verification to the user. Current handoff checks and remaining-phase contracts are documented in `srs-phase-three-four-review.md`.

## Phase 4 implementation and handoff

`phase-four/stages.ts` implements all four existing stage IDs/state keys. `context.ts` owns operating conditions and assumption/dependency follow-through; `attributes.ts` owns the course's four quality categories; `interfaces.ts` follows the template's four external interface categories. Chapter 3 supplies quality classification, Chapter 10 supplies use-case-driven navigation/input/output thinking, and Sunland illustrates role-specific access and availability expectations—not default requirements, thresholds, technologies, or legal applicability.

| Stage | Shared content | Document placement |
|---|---|---|
| Operating Context | Stage-local operating conditions; existing `records.scopeDecisions` filtered to Constraint | 2.4 Operating Environment; 2.5 Constraints |
| Quality Attributes | `records.requirements` filtered to Quality and category | 4.1–4.4 Quality Requirements |
| Interface Requirements | The same requirement collection filtered to Interface and boundary category | 5.1–5.4 External Interface Requirements |
| Assumptions & Dependencies | Existing `records.scopeDecisions` filtered to Assumption; existing `records.evidenceIssues` | 2.6 Assumptions and Dependencies; shared issues in 8.2.1 |

### One requirement register

`requirement-records.ts` owns kind fields, ID namespaces, and filter descriptors. `records.requirements` uses one numeric ID sequence across Functional (`SRS-FR-*`), Quality (`SRS-QR-*`), and Interface (`SRS-IR-*`) records. Gaps within a namespace are expected. Kind and `specificationGroup` are internal immutable classification fields; no UI operation silently changes a record's published prefix. Never format every record as an FR or treat all records as behavioral requirements.

Phase 3 normalization runs first and supplies `requirementKind: Functional` to legacy requirements while preserving explicitly classified records and existing numeric IDs. Its form, preview, prompts, completion, and coverage review all use the Functional filter. It now uses `completionMinimum: 1` instead of creating an initial blank requirement, avoiding phantom rows in a shared filtered collection. Phase 4 creates a record only through the appropriate category form; normalization preserves its explicit kind/group and undeclared fields. No separate quality or interface catalogs or phase-local requirement copies exist.

All requirement kinds share statement, source/use-case references, rationale, priority, status, acceptance criterion, verification method, and open questions. Quality records add measurement conditions and target agreement/authority. Interface records add an actor ID, boundary description, relevant interaction/contract details, failure handling, and related requirement references. Phase 4 category reviews support justified non-applicability; optional collections do not force invented requirements. Existing one-third array completion remains structural, not approval or semantic validation.

### Refine evidence, don't copy it

Constraints and assumptions keep their SRS-SCP IDs and editable source fields. Constraints add affected IDs and compliance evidence. Assumptions add dependency classification/provider, affected IDs, validation plan/state/evidence, and failure impact. A confirmed scope decision is distinct from a validated factual assumption. Later changes remain visible in Scope Baseline. Invalidated assumptions and superseded decisions stay stored. Phase 1's explicit preview still displays its original scope decision fields; Phase 4's placed previews include these new substantive details.

`evidence.ts` supplies collapsed source references/navigation and clipboard context from the baseline, actors/goals, catalog, detailed behavior, functional requirements, feasibility findings, and preceding Phase 4 stages. Category review outcomes are included even when no requirement was added. `QualityStageForm.ts` combines generic EvidenceForm/RecordReviewPanel; `quality-review.ts` gives advisory ID, acceptance, agreement, and validation-gap checks, never automatic approval or completion changes. Schema-based previews represent all authored stage fields under the finished-document outline, not workflow numbering.

Phase 5 should use these same requirements, scope decisions, actors, cases, issues, and artifact records when models reveal omissions. DrawIO upload/preview remains available in Phase 3; interface mockups and additional model uploads belong to Phase 5, not this implementation. The original implementation left verification to the user; the maintenance review adds focused regression checks (see `srs-phase-three-four-review.md`). Final assembly/print validation is still a later-phase responsibility.

## Cross-phase follow-through

`issue-follow-up.ts` supplies additive fields on the shared issue register. `follow-through-review.ts` keeps unresolved questions visible, checks ownership/actions/resolution phase and closure evidence, and is consumed by both Phase 3 and Phase 4. Phase 4 also carries Phase 3 consistency findings forward. `record-review.ts` owns common SRS/figure reference checks; `requirement-fields.ts` owns the common requirement answer contract.

Detailed descriptions carry casual questions and offer `workflowEvidenceNotes` for justified walkthrough evidence. Phase 4 `review-outcomes.ts` compares review outcomes with actual category records and assumption validation. These checks are advisory, read-only, and distinct from completion or approval.

For course rationale, answer lifecycle, Phase 5–7 entry points, final assembly inclusion/deduplication rules, and focused verification, read `srs-phase-three-four-review.md`.

## Content rules for future stages

- Read prior document and SRS records through the full document model passed to nested forms.
- Reference canonical records by stable ID instead of copying labels or descriptions into phase-local collections.
- Store Phase 1 evidence issues, intended audiences, scope decisions, and controlled terms under the root SRS `records` object. Stages reach those collections through schema `dataPath` values.
- Treat evidence panels as live views. Corrections belong in the source document; the SRS stage records only its acceptance, qualification, conflict, or derived decision.
- Treat stakeholder records as evidence for actor discovery; a stakeholder is not automatically an actor.
- Maintain one actor catalog, goal catalog, use-case catalog, requirement catalog, artifact registry, and issue/reconciliation log outside the navigation hierarchy.
- Let later phases enrich or reopen earlier records. Do not create a second version of a record merely because the user entered a later phase.
- Accumulate traceability as records are related. The reconciliation phase audits those links rather than asking the user to re-enter a matrix.
- Store diagram files once in the shared artifact registry, then reference them from the applicable model or document destination.

## Compatibility

Schema normalization preserves undeclared saved keys without converting their meaning. No migration or archived-answer recovery code is present. Do not reuse retired IDs or state keys for different meanings.


## Parent/context grouping beyond Actors & Goals

Candidate Processes and Use-Case Catalog group the same `records.useCases` by `primaryActorId`. Outgoing relationships group by `fromUseCaseId`; interface requirements group by `externalActorId` within their existing kind/category filters. `repeatable.parent` drives the generic grouped editor; missing or unavailable parents route records into a recovery area without dropping saved data. Qualified interface boundaries may remain ungrouped. Automatic parent fields do not count toward user-entered completion.

This is an editing layout, not a new ownership model: supporting actors, multiple goals, requirement coverage, and source evidence remain shared links. Partial previews and later phases still consume canonical collections. See `record-relationships.md` for the broader app review, edge cases, and manual verification.
