# Connected project evidence

Planning documents and SRS stages use one earlier-answer panel. Sources are selected by each page’s declarative `evidence.sources` descriptors; `core/evidence/evidence-model.ts` resolves the selected sections against the active schema tree.

The panel shows current source names, counts of sections with recorded answers, and links to the originating forms. Expand **Read earlier answers** to inspect the actual field values and stable record IDs. Blank source sections say that no answers have been recorded yet and provide a working link. A source’s availability count describes its selected evidence, not approval or completion of its whole document.

The same resolver supplies copied form-prompt evidence and baseline source availability. Human display text and AI instructions remain separate; shared resolution covers the source data only. Guided interviews omit earlier connected-project evidence, but include the full current-tab schema, inventory, and current answers so every applicable item is covered. Earlier source facts come from reliable available conversation history or project memory. Form prompts retain complete selected evidence; panel expansion never changes clipboard content. See the authoritative [AI prompt contract](ai-prompts.md).

## Source contract

- `pageId` identifies a root page; optional `nodeId` identifies a nested stage. State paths and navigation selections come from the current schema tree, including stages moved to a different phase.
- `groups` selects current section IDs. Omit `fieldKeys` / `recordFieldKeys` to use that section’s active fields. An explicit field selection is intersected with those fields; unknown keys never become unlabeled fallback data.
- Removed sections and sources with no resolvable selected sections are omitted. Repair the feature descriptor when an authoring section is replaced; do not invent aliases or infer a replacement from similar field names.
- Shared section `dataPath` values resolve canonical collections without modifying saved state. Repeatable `recordFilter` and retirement rules match the source form. Conditional fields follow their visibility rules unless `preserveWhenHidden` explicitly retains authored content.
- Untouched defaults do not make a section populated. Once an answer or record is meaningful, its populated selected fields remain available, including relevant defaults and optional supporting detail.
- Repeated references to the same source and section are combined. Records are combined by stable display ID and fields by key, without changing saved arrays.
- Diagram fields expose file metadata only. Neither the panel nor copied evidence includes image data URLs or DrawIO XML. Nested source references are rendered from declared child fields rather than as `[object Object]`.

The SRS source definitions in `phase-one/evidence.ts`, `phase-two/evidence.ts`, `phase-three/evidence.ts`, and `phase-four/evidence.ts` use the simplified authoring sections. The former readiness/review questionnaires are not source sections. Quality/interface evidence includes the current applicability choices alongside requirements.

The evidence correction was introduced in `0.3.1-alpha`; the app-wide AI workflow is `0.4.0-alpha`. `.dsrs` format remains 2.

## Manual review — not run

1. Fill CR problem, outcome, needs, and boundary. Open SR’s connected evidence, expand earlier answers, and confirm their values and stable IDs. Change a CR answer and confirm the evidence updates.
2. Open an empty workspace’s SR/CBA/FSA panels. Expect real section names, useful empty messages, and working **Open section** buttons. No “Source context” or “Source section unavailable” placeholders should appear.
3. Inspect SRS baseline, discovery, behavior, and quality stages. Open a source section in a different phase; confirm its phase, tab, and section are selected. Repeated prerequisites should appear once per source section.
4. Add actors, goals, use cases, requirements, and diagrams. Confirm evidence follows source-stage filters, excludes retired records, and preserves stable IDs after another record is retired. Inspect shared issue resolutions in baseline evidence.
5. Mark a quality/interface category Not applicable. Its applicability answer should remain available even when no requirements are recorded in that category.
6. Copy a form prompt and compare source names, values, and IDs with the panel. Copy an interview prompt and confirm it contains the complete current-tab record inventory/answers but no earlier connected-source excerpt. Diagram payloads must be absent from both; file metadata remains useful context. Panel collapse state must not affect copied prompts.
7. Save/reopen a `.dsrs`, inspect the baseline source reference preview, and check that editing evidence is done at its source. Review the panel with keyboard and on a narrow viewport; long answers, Markdown, IDs, and navigation controls should stay readable.

No automated checks, builds, tests, or browser verification were run.
