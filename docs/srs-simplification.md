# SRS authoring

This defines the active concise forms and completion contracts, superseding the earlier form-depth and review questionnaires in `srs-construction-workflow.md` and `srs-phase-three-four-review.md`. [AI prompt contract](ai-prompts.md) is authoritative for all AI behavior. The course template's brief scope, feature list, user characteristics, role/outcome descriptions and progressively detailed use cases set the normal depth. A useful SRS does not require a separate explanation of every classification or a repeated declaration that nothing was found.

## Implementation map

| Concern | Owner |
|---|---|
| Active authoring fields, essentials and legacy qualifications | `src/features/software-requirements/simplification/field-policy.ts` |
| Stage composition, short forms, category applicability, optional controls | `simplification/stages.ts` |
| Name-based record links | `simplification/references.ts`, generic `components/fields/RecordLinksField.ts` |
| Connected sources for form evidence | `simplification/evidence.ts` |
| Each tab's finish line | `workflow/prompt-tasks.ts` |
| Human tab guides and section tips | `simplification/help-content.ts` |
| AI interview definitions | `workflow/prompt-definitions.ts` |
| Shared questions | `simplification/SupportingWork.ts` |
| Phase 1 explicit preview reduction | `simplification/preview.ts` |
| Interview/form prompt separation and child contracts | `core/ai/{interview-prompt,form-prompt,prompt-schema,prompt-builder,prompt-contract,evidence-context}.ts`; `docs/ai-prompts.md` |

Paths in the table without `src/` are relative to `src/features/software-requirements/`, except the explicitly named core/components/app paths, which are relative to `src/`.

Original phase schemas retain descriptors/defaults used to build the simplified stages. `simplifyStage` is the active authoring boundary: changing an old descriptor does not automatically reintroduce a retired input. Edit the policy and finish line first. Do not bypass this boundary by registering an old schema directly. Core remains feature-neutral.

## Normal authoring

- Evidence Intake: connected sources plus actual questions. No acceptance essay, evidence cutoff or readiness questionnaire.
- Specification Frame: brief purpose, audience names and optional refinement of carried product context.
- Scope: the original boundary shown once, with material decisions only. Features are carried from the System Request.
- Vocabulary: terms, definitions and optional usage notes.
- User Classes: existing group names and characteristics affecting use; no repeated interaction questionnaire.
- Actors & Goals: actor name, optional clarification and goal list. Canonical actor/goal IDs and automatic links remain.
- Use Cases: one catalog in discovery, including optional directed relationships. The second catalog stage is removed; old navigation selections are redirected. New triggers, interests and other detail belong in Detailed Descriptions.
- Casual Descriptions: refine `briefDescription` on the same use case, not a second mandatory account. Older separately saved stories are not automatically rewritten.
- Detailed Descriptions: carried identity, editable trigger, appropriate detail level, conditions, numbered normal flow and relevant alternatives/subflows. No justification essay for choosing overview or omitting a diagram.
- Diagrams: actual file, title, caption, named case links and optional scenario. No prose transcription of lanes, guards and object flows. Binary/XML payloads stay out of prompts.
- Functional requirements: statement, existing links and optional acceptance detail. Rationale and verification-method essays are not routine inputs.
- Quality requirements: put conditions and measurable targets in the statement. Preserve proposed/agreed status. Categories use a simple applicability choice, not findings essays.
- Interface requirements: put the required exchange/contract and necessary failure behavior in the statement, linking earlier obligations where appropriate. Separate overlapping contract inputs are retired.
- Environment: one concise description. Constraints and assumptions retain their original records; supporting qualifications are optional. Validation state is still distinct from decision confirmation.
- Questions: one shared register accessible from any stage. Answer and update the affected source; do not create a second backlog. Resolved questions and accepted exceptions are hidden from the Shared questions list but remain saved and available in Evidence Intake.

Existing provenance remains stored and can accompany field prompts without requiring re-entry. Typed source locators remain available for external evidence. Known actor, goal, use-case and figure links use name-based selectors while preserving the saved comma-separated ID representation. Unavailable links remain visible until explicitly corrected.

Progress percentages, bars, phase totals and completed-tab indicators are available for the simplified SRS. Completion follows the active essential fields and record minimums; removed fields, optional qualifications, hidden metadata and read-only context do not contribute. Detailed Descriptions evaluates the trigger, detail choice and visible normal flow rather than carried catalog identity; an overview does not require hidden flows. The AI guidance button remains alongside progress. CR/SR/CBA/FSA follow the same concise authoring approach; see [Planning simplification](planning-simplification.md). Remaining Phase 5–7 placeholders have not been implemented and remain incomplete.

## Prompt contract

Human guides and section tips are authored independently of AI instructions. Every implemented stage has an on-page guide with explanatory paragraphs, including completed stages. Section question marks show plain prose for the current form, without a fixed What/Why/What-to-enter format. The separate copy button generates the AI prompt from `ai` descriptors and supplied records; prompt builders never read the human guide or tooltip. Category applicability controls have their own helper text.

The tab interview receives the complete active schema and current-tab inventory/answers, including every eligible use case, child field, choice, and conditional possibility. It gathers missing information naturally and tracks coverage of all applicable entries before handing off to the exact scoped copy controls. Earlier connected-source evidence is omitted; reliable available conversation history or project memory supplies those facts. Form prompts return complete supported answers for their selected scope, with no follow-up questions or update-only contract. The shared [AI prompt contract](ai-prompts.md) covers section, group, individual-record, field, and nested-field behavior; `guided-interviews.md` supplies manual cases.

## Saved workspaces

Application version is 0.4.0-alpha and new saves use workspace envelope version 2. Imports and local storage validate the envelope and normalize current fields; there is no version migration, answer conversion, archive creation, recovery UI or legacy navigation remapping. Accepted older envelopes are read as supplied. Undeclared saved values are preserved without rewriting or deleting them, including data previously produced by migration.

Optional inputs show their title once in the disclosure summary. The inner input retains a visually hidden label for accessibility.

## Manual verification — not run

1. Import a saved workspace and save/reopen it. Confirm current answers and files remain intact without creating an archive or converting earlier answers.
2. Confirm obsolete saved navigation falls back to an available stage. Editing a use-case summary should appear in Casual Descriptions and detailed context.
3. Create actors and goals, then use cases. Confirm automatic parent links, moving and retirement preserve IDs and unavailable-link recovery still works.
4. Select several named links, retain an unavailable saved link, remove one explicitly, then save/reopen. Inspect preview labels and copied reference values.
5. Inspect every implemented SRS stage: no retired review questionnaires, no archived-answer recovery UI, no blank optional field paragraphs in previews, and an accessible AI guidance button alongside the completion percentage and bar. Fill essential answers and inspect phase totals and completed-tab indicators; blank optional answers must not block completion. In Detailed Descriptions, switch between overview and detailed behavior and confirm only visible essential fields count. Phase 5–7 placeholders must remain incomplete.
6. Add functional, quality and interface obligations. Confirm category/kind filters and namespaces remain distinct; optional acceptance detail is not required. Exercise Applicable / Not applicable / Needs clarification without creating placeholder requirements.
7. Copy Actors & Goals and Use Cases tab interviews: verify natural definitions, complete eligible inventories/current values/child contracts, reuse of available prior context, coverage of every applicable item, and the scoped-prompt handoff. Paste group, record, and field prompts afterwards: only the requested scope should be returned, in order, with complete supported answers and no invented IDs or follow-up questions.
8. Inspect Phase 1 carried scope/features/references and all diagram previews/print output. Confirm payloads never enter text prompts.
9. Expand optional fields: the title should appear once, while the control retains an accessible label. Try a fresh workspace: no recovery archive, no phantom canonical records, no repeated-use-case catalog, and no approval inferred from defaults.
10. Open the human guide on all 16 implemented stages, including completed tabs. Inspect section tips and the quality/interface applicability tips by mouse and keyboard: meaningful prose, no empty sections or undefined values. Copy the separate AI interview and form prompts; confirm interviews include complete current-tab context while form prompts retain exact references and complete selected evidence. Neither should copy on-page help or diagram payloads. Use `guided-interviews.md` for the app-wide prompt review.

Category/overview contradictions are surfaced by `simplification/authoring-findings.ts`; these are specific findings, not a replacement checklist of optional fields.

No builds, tests, browser checks or automated verification were run for this refactor, per the user's instruction. Existing automated tests that encode the former questionnaire/one-third-completion contracts will require revision before being treated as release validation.
