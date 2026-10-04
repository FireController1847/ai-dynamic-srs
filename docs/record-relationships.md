# Record relationships and grouped editing

## App-wide review

This review concerns repeated entry of an existing parent/context link, not creating new ownership rules. Canonical collections and stable IDs remain separate from the editing layout.

| Area | Relationship | Editing decision |
|---|---|---|
| Actors & Goals | Actor → goals | Existing actor-first form automatically sets `actorId`; retains its specialized actor-and-goal editing layout. |
| Candidate Processes | Primary actor → use cases | Group by primary actor and set `primaryActorId` automatically. Supporting actors and goals remain independent references. |
| Use-Case Catalog | Primary actor → same use cases | Same grouping and saved collection as Candidate Processes; no second catalog. |
| Use-Case Relationships | Source use case → outgoing relationships | Set `fromUseCaseId` from the group; user still chooses relationship kind and target. This is an editing context for directed relationships, not a containment tree. |
| Interface Requirements | External actor → interface obligations | Group within each existing interface category and set `externalActorId`. A qualified boundary may remain without an established actor. |
| System Request / Business Value | Business capability → expected benefits | Set `relatedRequirement` for a single-capability benefit. Keep project-wide and multi-capability benefits in a separate area; retain saved free-text links. |
| General Notes | Note → references and edit history | Already nested; no additional parent input or change needed. |
| CBA | Benefits/costs → annual values; evidence sources | Annual values already belong to their record. Source IDs are shared evidence, not exclusive parents. |
| Client Requirements | Stakeholders, needs, and sources | Stakeholder goals/concerns are already in the stakeholder record. A need's source may be a person, meeting, or document; do not force one stakeholder owner. |
| Feasibility | Stakeholder assessments, risks, and evidence | Concerns, engagement, and mitigation belong to their existing records. Risk owner/source text does not establish a single canonical parent. |
| Effort Breakdown | Task → member allocations | The existing matrix expresses multiple allocations per task; do not flatten it into one owner. |
| SRS perspectives, scope, requirements, figures, issues | Evidence, applicability, and coverage links | These may relate to several records/documents. Preserve shared references and category filters; do not invent exclusive ownership. |
| SRS casual/detailed descriptions | Use case → elaborated answers | Already enrich the same use-case record with carried identity; no duplicate child catalog or parent input needed. |
| Future SRS phases | Unimplemented model/reconciliation/assembly stages | No active forms to refactor. Apply the existing-record pattern when implementing them. |

## Implementation entry points

- `src/core/records/parent-records.ts`: read-only grouping of canonical records and parent-scoped section descriptors. It preserves each section's original filter.
- `src/components/forms/RelatedRecordGroups.ts`: add, move, reference-aware remove, and scoped copy actions; used by `DynamicForm` only when a section opts in.
- `src/components/forms/RelatedRecordItem.ts`: ordinary fields plus an optional name-based reassignment control. No repeated parent field in normal grouped editing.
- `repeatable.parent` in the relevant feature schema: owns domain vocabulary, relationship field, parent source, eligibility, and ungrouped behavior.
- `core/ai/prompt-schema.ts`, `form-prompt.ts`, and `prompt-contract.ts`: render complete child contracts and scoped outputs, provide available parent contexts, and keep automatic links as context. [AI prompt contract](ai-prompts.md) defines the shared workflow.

Generic components do not import feature modules. Parent grouping is a display projection, not a new saved structure. Previews and downstream catalogs retain canonical record placement and links. The existing Actors & Goals component remains specialized because it edits the parent itself alongside its children.

## Preservation and edge cases

- Add beneath a parent sets only the existing relationship field. New records use the lowest available positive ID; retired IDs and IDs still referenced elsewhere in the workspace remain reserved.
- Reassignment changes that field only; the child's ID, other answers, and incoming references stay intact. Later consistency reviews expose any semantic mismatch caused by a move.
- Retired/ineligible/missing parents do not delete children. Those children appear in the ungrouped recovery area. Source/primary actor eligibility uses the feature schema; stored records remain untouched.
- Case collections now use `minimum: 0` and `completionMinimum: 1`; empty new workspaces do not create unattached placeholders. Untouched legacy placeholders can be reused when adding under a parent.
- Stable-ID records retire on removal when another saved value still references their display ID. Unreferenced records are removed outright, releasing their numeric ID for reuse; referenced record IDs and authored content stay preserved without a format-version change.
- Optional interface actors stay optional when the boundary is qualified. Shared/project-wide benefits remain valid without one requirement owner.
- Free-text benefit relationships are never parsed into guessed parents. Only an exact existing ID groups automatically. Free-text/multiple links remain in the separate area; its explicit Save relationship action prevents regrouping midway through typing. Choosing a single parent explicitly replaces the saved link.
- No normalization, completion, or preview consumer should treat the visible groups as separate saved collections. Parent fields are marked `completion: false` because the form fills them.

## Manual verification checklist

No builds, tests, browser checks, or other automated checks were run for this refactor.

1. In Candidate Processes, add use cases under two different actors. Confirm their primary actor is assigned without repeated entry. Open Use-Case Catalog and confirm those same records appear under the same actors.
2. Rename a parent, move a child using its name-based selector, save, and reopen. Confirm child IDs and answers stay unchanged and later references still resolve.
3. Add outgoing Includes/Extends/Specializes relationships under a use case. Confirm the source is automatic, the target remains selectable, and the existing direction/cycle checks still apply.
4. In each interface category, add an actor-linked obligation and a qualified boundary obligation without an actor. Confirm category, requirement kind, ID namespace, and boundary answers remain intact when moved.
5. In System Request, add a benefit beneath a capability. Also edit a cross-cutting benefit with several references. Save its relationship and confirm it remains cross-cutting rather than being reduced to one parent.
6. Remove a parent that has children. Confirm children appear in recovery rather than disappearing. Reassign one, retire another, and verify saved/preview behavior. Also try old data with blank, invalid, or unavailable parent references.
7. Copy group, record, and nested-item prompts. Confirm their requested editable scope is exact, the automatic parent is context, supporting evidence remains available, and responses return complete supported answers without follow-up questions. Copy the tab interview and confirm all eligible groups and their child records appear in its coverage inventory.
8. Compare form completion and document previews before/after moving records. Confirm automatic linking does not count as a user-entered answer, ungrouped records remain visible, and children are neither duplicated nor dropped.
