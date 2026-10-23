# Optional Phase 6 AI editorial cleanup

**Step 5 of Reconcile & Verify** is an optional, pre-assembly editorial pass. It never changes progress requirements, SRS approvals or requirements status. Skipping it leaves the workspace untouched.

## Workflow

1. Select **AI Cleanup (Optional)** after the four Phase 6 reconciliation and verification stages.
2. Choose **Copy AI cleanup prompt** and paste it into ChatGPT. The prompt includes the complete saved workspace Markdown context (with figure file bytes excluded), plus a compact list of currently populated, active, editable SRS narrative fields. It does not require another interview.
3. ChatGPT returns exactly one `dsrs-cleanup` v1 JSON object with only meaningful, shorter replacements: `{"format":"dsrs-cleanup","version":1,"edits":[{"id":"c...","snapshot":"...","text":"shorter wording"}]}`. An empty `edits` array is valid.
4. Paste into the stage panel and choose **Validate suggestions**. The application verifies that each ID maps to a live editable narrative field, each copied snapshot still matches the current saved value, no field appears twice, the replacement is shorter and nonempty, and canonical SRS/FIG IDs in that field are retained.
5. Read the side-by-side original/replacement for each proposal. Select only edits that keep all material conditions, observable behavior, exceptions and requirements. **Apply selected edits** updates those original fields in the reactive document and triggers the existing autosave; unselected suggestions change nothing.

Only existing SRS `textarea` fields are eligible. Stage and record identifiers, references, choices, statuses, dates, figures, planning documents, read-only and inactive inputs, and nested non-text structures cannot be patched. The proposal is not a second requirement catalog, issue register, approvals workflow, or bulk replacement of the finished document. Its context may include source records outside SRS, but edits do not modify them.

This is an editorial safeguard, not a semantic-verification engine: mechanical validation cannot prove a shorter paragraph retains every requirement or nuance. The user deliberately selects every edit. If a meaningful contradiction or actual missing project decision appears, it belongs in the existing reconciliation interview and canonical source record, not in a cleanup proposal. The import does not interpret source material as instructions.

The cleanup format is transient, independent of `dsrs-form` v1 and `.dsrs` workspace format 2; it is never saved as a separate dataset. It writes existing source strings only, so the eventual Phase 7 document picks up accepted wording automatically.

## Focused manual review (not run)

1. Check navigation lists **SRS-06.5 AI Cleanup (Optional)** after Verification & Traceability; Phase 6 completion is identical whether or not this stage is visited.
2. With populated SRS narratives and prior CR/SR/CBA/Notes context, copy the prompt. Confirm every eligible SRS narrative includes an ID/snapshot and the workspace context includes previous saved material without XML/image bytes.
3. Paste `{"format":"dsrs-cleanup","version":1,"edits":[]}`; it should validate and leave nothing to apply.
4. Paste a valid single shorter replacement using its current ID/snapshot. Confirm the comparison appears and **Apply** remains disabled until its checkbox is selected; after applying, the original field and document preview use the new wording.
5. Try a duplicate ID, invented ID, wrong snapshot, deleted canonical ID, unchanged/empty/longer text and invalid JSON. All should fail before touching data.
6. Change a source field after copying or validation. Applying a stale proposal should fail without modifying any selected records. Unselected proposals must remain unchanged.
7. Verify Phase 6 other stages, review outcomes, requirement IDs, figure files and Phase 7 assembly remain unaffected; workspace format stays at 2.
