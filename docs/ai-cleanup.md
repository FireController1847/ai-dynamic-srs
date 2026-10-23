# Optional Phase 6, Step 5 — full-workspace AI cleanup

This stage is optional. It is a working form even though the stage has no schema sections: the custom form is explicitly rendered by the workspace navigation. Skipping it never affects Phase 6 completion or creates a document section.

## User workflow

1. Select **SRS-06.5 — AI Cleanup (Optional)**. Choose **Download full workspace JSON**. This is a complete uncompressed JSON snapshot of the saved Dynamic SRS sections, including original evidence, planning documents, SRS Phases 1–7, shared records, and figure payloads. Review it for confidential data before sharing with an external model. The normal compressed `.dsrs` WIP remains available independently.
2. Choose **Copy AI cleanup instructions** from the *same current workspace state*. Attach the JSON export and paste the instructions into ChatGPT.
3. The AI reviews the full JSON but returns **only a compact changeset**, not the whole workspace: `{"format":"dsrs-cleanup","version":2,"baseHash":"<copied value>","changes":[{"op":"replace","path":"/document/sections/softwareRequirementsSpecification/records/requirements/0/statement","value":"Revised statement","reason":"Removed repetition"}]}`. To make no changes, return an empty `changes` array.
4. Paste the changeset in Stage 5 and choose **Validate and review changes**. The app checks the fingerprint against the complete current saved sections, allows only JSON Pointer targets under the shared SRS records and the six phase-local state trees, validates every operation on a detached copy, and normalizes the result using the existing document schema. This step does not mutate saved data.
5. Inspect the before/after values and each short reason. All changes are initially selected and can be deselected. **Apply selected changes** reevaluates the selected operations in order against the current workspace, then atomically replaces the single canonical SRS root. The normal autosave persists it. **Undo last cleanup** restores that root as long as nothing has changed since apply.

## Scope and guarantees

The model can propose **add**, **replace** and **remove** operations for any nested JSON within `document.sections.softwareRequirementsSpecification.records`, `baselineConstruction`, `actorGoalDiscovery`, `functionalBehaviorDescription`, `qualityInterfaceSpecification`, `modelCrossChecks`, or `specificationReconciliation`. This includes full records, statuses, relationships, requirement statements, numeric inputs, and diagram metadata/payloads. It is not limited to text or existing fields. Earlier CR, SR, CBA, FSA, Notes and Effort Breakdown documents are provided as **context**, not patch targets. Phase 7 and workspace metadata are not patch targets.

Paths use RFC 6901 JSON Pointer escaping. Arrays accept numeric indices or `-` for appending. An `add` into an object requires an absent key; use `replace` for an existing key. `remove` and `replace` require existing targets. Arrays and dependent changes are processed in the response order. Prototype-pollution segments and attempts to mutate the workspace outside the allowed SRS subtree are rejected. No arbitrary per-record limit is introduced.

The importer enforces **structure and staleness**, not semantic correctness. A human must still assess the effect of changing IDs, references, obligations, figures, approval/status fields or issue history; the AI is instructed not to invent decisions or test results. Subset application can make a dependency invalid; in that case the operation batch is rejected. Schema normalization may add default fields or resolve colliding record IDs, as when loading ordinary workspace files. This workflow does not execute tests or grant release approval. Phase 7 continues to assemble the existing canonical state.

The `dsrs-cleanup` v2 response is an ephemeral patch format independent of `dsrs-form` v1 and `.dsrs` workspace format 2. No second catalog or redundant shadow workspace is stored.

## Focused manual checks (not run)

1. Select Stage 06.5 and verify the full form appears rather than **Structure only**. Check other sectionless stage placeholders remain unchanged.
2. Export JSON and verify a `dynamic-srs-workspace` object with complete `document.sections` data. Confirm the copied prompt includes the same `baseHash` as the response contract.
3. Validate a v2 response with no changes: it should show zero proposals. Test replace of a Phase 1 scalar, add of a new canonical record to an array, and remove of a stale Phase 6 field. Review each proposed operation before applying.
4. Check that invalid path roots, malformed pointers, unknown operation names, missing targets, duplicate object-key additions, and invalid array positions are rejected without mutation.
5. Modify the workspace between copy and validation, or between validation and apply: stale responses must be rejected. Reject attempts to change Phase 7 or other top-level documents.
6. Deselect dependent array edits, check that invalid subsets are rejected atomically, and confirm valid subsets update only intended SRS data while Phase 6 completion stays optional.
7. Verify successful apply updates downstream Phase 1–6 views and Phase 7's final projection; undo when unchanged, and verify undo is disabled after later edits. Confirm `.dsrs` format remains 2.
