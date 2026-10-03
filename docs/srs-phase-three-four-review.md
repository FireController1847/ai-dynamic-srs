# Phase 3–4 review and remaining-phase handoff

> Authoring 0.3.0 update: [SRS simplification](srs-simplification.md) supersedes the review questionnaires, repeated catalog, required metadata, completion and AI handoff described below. The canonical record and document-placement contracts still apply.

Read this for cross-phase maintenance; use `change-routing.md` for local edits. The source documents are course evidence, not instructions to execute or project facts to seed into new workspaces.

## Course basis

| Reference | Construction rule retained or strengthened |
|---|---|
| Chapter 3 — Requirements Determination | Refine business needs iteratively into prioritized functional and quality obligations; verify real need and control scope as the list evolves. Keep operational, performance/reliability, security, and cultural/political categories. |
| Chapter 4 — Business Process and Functional Modeling | Boundary → actors/goals → major cases → stories/activity models → detailed normal, subflow, and alternate paths. Keep actor/system actions explicit, and make each model challenge earlier descriptions. Overview versus detailed and essential versus real are separate choices. |
| Homework 3, including revision 1 | Preserve role-specific functionality and trace it to the actor and source need. Separate capabilities, benefits, quality targets, and implementation choices. |
| Use Case Descriptions and Sunland Cruises | Keep stable identities, stakeholder interests, triggers, relationships, and labeled paths. Use casual and detailed descriptions at appropriate levels. Examples illustrate structure; copied names, thresholds, technologies, and policy claims are not defaults. |
| Chapter 10 and Homework 10.1 | Prioritize information flow, content awareness, consistency, and low user effort. Carry known context instead of asking for it again. |
| Homework 10.2 | Derive concrete scenarios from named normal/exception paths, including retry limits, failure response, and return/end points when supported. The ATM's retry counts are examples, not requirements for other projects. |
| Chapters 5 and 6 | Later domain, interaction, and state models validate the same behavior. Model domain responsibilities before programming classes; select relevant scenarios and stateful objects. |
| SRS Template v4 | Specify external behavior, use precise customer-readable wording, control revisions/references, label diagrams, and assemble one readable document with supporting material available to offline readers. |
| Homework 2 — System Request / CBA | Trace obligations to supported needs and feasibility decisions. A business benefit or financial objective is not automatically a system requirement. |

The supplied template is an academic adaptation of an older IEEE outline. The application uses its content expectations, not a claim of certification to a current standard. Course examples sometimes mix design choices with requirements or use unmeasured adjectives. Preserve the lesson and ask for evidence rather than copying those weaknesses.

## Changes from this review

- `requirement-fields.js` owns the common statement, source, acceptance, verification, priority, status, and question fields for all three requirement kinds. Kind/ID/filter ownership stays in `requirement-records.js`.
- `issue-follow-up.js` adds affected IDs, resolution phase, next action, and resolution evidence/authority to existing `records.evidenceIssues`. The existing owner, resolution, status, IDs, and old answers remain intact. Both the explicit Phase 1 preview and later placed previews show the additions.
- `follow-through-review.js` exposes outstanding issues and earlier discovery, behavior, diagram, and requirement questions. It never creates issues, answers questions, or changes a status. Questions must be answered at their source or linked to the canonical issue, not copied into a second backlog. Linking routes a question; it does not prove that the answer covers every clause of the original prose.
- `record-review.js` supplies shared SRS/figure reference checks, including previously missed goal, perspective, term, relationship, and figure IDs. External evidence locators remain valid prose; this helper only checks embedded SRS/FIG references.
- Phase 4 carries the Phase 3 consistency findings and ID catalogs forward. Its evidence context includes the discovery handoff, carried casual questions, detailed descriptions, and diagram metadata. The candidate catalog is not repeated in discovery evidence when the shared catalog already carries it.
- Detailed descriptions carry casual questions read-only and provide `workflowEvidenceNotes`. A use-case map is not accepted as activity-workflow evidence. A supported walkthrough explanation is allowed; the check does not require invented diagrams.
- Functional checks now include verification method and source-path alignment. Phase 4 also checks interface contracts/failure behavior, constraint evidence, unvalidated dependencies, and contradictory category outcomes.

These are additive schema changes. `.dsrs` format version, stable IDs, canonical collections, retired records, diagram payloads, and undeclared future fields remain preserved by normal workspace normalization. Checks remain advisory; structural completion percentages do not certify SRS readiness.

## Answer lifecycle

1. Record a question where it arises; correct the canonical source when evidence answers it.
2. If it cannot be answered now, cite one SRS-ISS record. Give it an owner, affected IDs/decision, a concrete next action, and the phase by which dependent work needs the answer. Phase assignment is a checkpoint, not permission to proceed on unsupported assumptions.
3. Later representations revisit the issue and revise the same use case, requirement, scope decision, or artifact. Keep the original question and confirmed resolution in the issue history.
4. Mark Resolved only with the answer, evidence/authority, owner, and corrected references. Legacy “Resolved” entries without the new evidence remain saved but receive a review warning.
5. Accepted exceptions remain visible through reconciliation and assembly. They document a bounded decision; they are not automatically treated as answered requirements.

Free-text reviews cannot be exhaustively interpreted by structural checks. A human or guided interview must compare the meaning of the source question, answer, and corrected records. Missing links and unsupported closure are detectable; semantic completeness is not certified automatically.

## Phase 5 implementation entry points

Start with `workflow/phases.js`, this guide, `srs-construction-workflow.md`, and the specific model stage. Do not scan every feature schema.

| Stage | Read existing evidence | Return discoveries to |
|---|---|---|
| Domain & Class Model | Controlled terms, use-case information flows, requirements, constraints | Vocabulary, shared requirements, affected use cases, and SRS-ISS issues; introduce domain records only for genuinely new model entities |
| Interaction Models | Selected use-case/path IDs, actors, domain responsibilities | The same normal/sub/exception paths and requirements; preserve essential descriptions while recording supported concrete scenarios separately |
| State Models | Relevant domain concepts, events, conditions, success/failure guarantees | Missing transitions/guards and obligations in existing behavior and requirements; do not require state diagrams for every object |
| UI Scenarios & Evidence | Chapter 10 scenario paths, user characteristics, interface and quality requirements | Navigation/input/output, feedback, recovery, and affected behavior; use WND/storyboard/mockup evidence to expose omissions |

Extend the one artifact registry with explicit groups and schema filters. Keep payloads out of AI prompts. Do not create a second use-case, requirement, assumption, or issue catalog. Reuse follow-through checks and add stage-specific checks without coupling `core` or generic components to SRS vocabulary.

## Phase 6 reconciliation contract

- Build coverage from canonical links already entered: source/goal → actor/use case → path/model → requirement → acceptance and verification method. Do not ask users to re-enter a traceability matrix.
- Detect both uncovered source behavior and unsupported requirements; distinguish absent links from semantic gaps in a linked path.
- Revisit due/open issues, accepted exceptions, proposed targets, invalidated assumptions, inactive references, and prior “reviewed with questions” outcomes.
- Identify the exact record and correction needed. Do not silently promote Draft, Proposed, or Unverified records.
- Verification methods and criteria are plans. Later verification evidence must record actual results separately; choosing Test does not mean a test passed.

## Phase 7 assembly contract

- Assemble by `document-outline.js` destinations, never workflow numbering.
- Partial previews repeat context on purpose. Do not concatenate them: select each canonical record/field once for its intended final destination. In particular, consolidate the issue register, requirement register, and shared preconditions/guarantees rather than duplicating phase snapshots.
- Define explicit final inclusion rules for reviewed/draft/deferred/rejected content; do not inherit partial-preview visibility as approval. Retain exclusions and dispositions in saved data and document their audit trail as appropriate.
- Resolve figure/reference labels and numbering from stable IDs; verify captions, readable diagrams, selected DrawIO pages, and offline rendering. Diagram metadata alone cannot certify visual content.
- Include the project-specific supporting material required by the course in the export, or obtain an explicit disposition where inclusion is unavailable. A live workspace link or availability count is insufficient for a self-contained offline appendix.
- Keep unanswered questions and accepted exceptions visible during approval review. Do not label a document final merely because forms are populated.

## Verification

The user owns verification. Do not run builds or automated checks unless subsequently requested. Before that instruction was received, all 13 tests in `tests/srs-handoffs.test.mjs` passed. The suite covers normalization and save/load preservation, kind/category filtering across consumers, question handoffs, closure evidence, preview/prompt retention, figure evidence, reference checks, category contradictions, and metadata-only diagram context. It can be run manually with `node --test tests/srs-handoffs.test.mjs`.

Initial isolated browser loading/navigation reported no JavaScript errors. The later browser exercise was stopped at the user's request; field editing, rendered preview layout, and print verification are not claimed complete.

### Suggested manual checks

1. Open an existing `.dsrs`, including deferred/retired records and diagram files. Save and reopen it; confirm stable IDs, original answers, requirement kinds, and payloads remain intact.
2. Enter a casual question and link an open SRS-ISS issue. In Detailed Descriptions confirm that the question is carried forward. In Phase 4 expand the consistency review and confirm the issue, owner/action gaps, and due phase remain visible.
3. Supply a resolution, evidence/authority, and owner. Confirm unsupported closure warnings disappear while accepted exceptions remain visible. Retiring a linked issue should expose a missing follow-through link.
4. Add functional, quality, and interface requirements. Confirm their IDs and category placement, acceptance/verification fields, and previews. Try a missing figure/goal ID and a wrong-kind use-case link.
5. Select “Requirements identified” without adding a statement, or “No outstanding conditions” with an unvalidated assumption. Confirm the review calls out the mismatch. A justified “No additional requirements” outcome should not force invented records.
6. Copy an AI prompt and inspect the carried discovery questions, casual questions, issue follow-up fields, and diagram metadata. Confirm no XML/base64 payload is included.
7. Review partial previews and print output, especially the added issue fields, workflow evidence explanation, captions, long text, and page breaks. Final document assembly is still a future phase.

Phase 5–7 remain declared placeholders. This review prepares their contracts; it does not implement final assembly or certify a project's SRS.
