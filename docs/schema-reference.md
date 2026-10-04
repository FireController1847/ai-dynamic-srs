# Schema reference

Schemas are plain objects consumed by the generic form, prompt, completion, state, and preview modules.

## Page

Common keys include `id`, `stateKey`, `code`, `label`, `title`, `description`, `form`, `guide`, `ai`, `document`, `sections`, and `subpages`.

Specialized pages may name `formComponent`, `summaryComponent`, or `previewComponent`. The corresponding component must be registered in `features/feature-registry.ts`.

`stateDefaults` may define shared page-level records that do not belong to one navigation leaf. Defaults are merged recursively during workspace normalization.

A document may limit which values fall back to the shared project context with `document.contextFallbackFields`. This lets related documents reuse project identity without silently inheriting another document's author, issue date, version, or status.

## Section

A section has a stable `id` and `key`, display text, help content, and either `fields` or `repeatable`. Set `includeInPreview: false` for input-only document-control sections.

Set `dataPath` to an absolute path within the full document state when several workflow stages must edit one canonical record collection. Form rendering, completion, AI prompts, and generic previews resolve the section against that shared model instead of creating a tab-local copy.

Pages may also declare an `evidence` descriptor containing source page IDs and curated source sections or fields. `core/evidence/evidence-model.ts` resolves this descriptor for the on-page earlier-answer views, copied AI evidence, and baseline source availability. Select current section IDs; omit field whitelists when the section’s active fields are the desired context. Retired sections and unknown field keys are omitted rather than displayed as unavailable. Navigation and nested state paths are derived from the active schema tree. See `connected-evidence.md`.

Human help and AI prompts have separate contracts. `section.help` is prose (a string or `{ text }`); the question-mark control displays it as plain text, without fixed questions or headings. Older What/Why/Expectation descriptors render as paragraphs with missing values omitted. The independent copy control uses `section.ai.draftingGuidance`, page `ai` guidance and field `aiHint` values, never tooltip text. A page `guide` supplies a title, summary and `paragraphs`, optional steps and terms for the on-page guide; its visibility is independent of completion.

## Field

Supported field types are:

- `text`, `date`, `number`, and `url`
- `textarea`
- `select`
- `checkbox-group`
- `period-values`
- `nested-records`
- `diagram-file` (validated uploaded or AI-generated DrawIO file payload; rendered media in list previews, metadata only in ordinary prompts)

Common field keys include `key`, `label`, `type`, `default`, `columns`, `placeholder`, `helpText`, `aiHint`, `completion`, `includeInPreview`, and `showWhen`.

`editable: false` renders carried context without an input and excludes it from repeatable completion. `hidden: true` hides internal metadata from forms; use `includeInPreview: false` and `includeInPrompt: false` as appropriate as well. A select may declare `reference: { dataPath, displayId, labelField }` for live record choices that save stable IDs.

`diagram-file` fields declare `collectionPath` and `artifactField` for shared storage limits. The payload contains source filename, kind, MIME type, byte count, timestamps, and content. Every editable field offers upload and Import AI diagram. An optional typed `diagram` descriptor selects the registered semantic type, reference/evidence sources, scope links and saved-label aliases for the section/figure generation prompt. The AI returns a compact `dsrs-diagram` graph; the application owns validation, layout and editable DrawIO XML generation. Both paths preserve the same file in `.dsrs`; original XML and image payloads never enter clipboard prompts. See [AI-generated diagrams](ai-diagrams.md).

Visibility conditions use either one condition or `showWhen.all`. A condition supports `equals` or `in`.

## Repeatable section

Repeaters define `dataKey`, `itemLabel`, `addLabel`, `minimum`, `fields`, optional `completionFields`, optional `primaryField`, and optional `displayId` with `prefix` and `padding`.

Defaults and imported values are normalized centrally. Components should not add compatibility-specific schema handling.

Optional repeater settings:

- `allowAdd: false` / `allowRemove: false`: a later stage edits existing records without creating a second catalog.
- `recordFilter`: an `equals`/`in` condition (or `all`) applied consistently to forms, completion, placed previews, and evidence/prompts. It never removes stored records.
- `completionMinimum`: requires records for progress without creating placeholder records during normalization; otherwise completion uses `minimum`.
- Repeaters with no editable completion fields are carried context and do not add incomplete entries to progress. Use `completionFields: []` when a section only displays records authored elsewhere.
- `artifactField`: enables multi-file diagram upload, with a new stable record ID per accepted file.

Sections using `PlacedStagePreview` declare `documentTarget` and optional `documentSubsection` and `previewTitle`. They keep all authored fields without a separate preview whitelist. Scoped item prompts include their parent context; connected evidence comes from the page evidence descriptor.


## AI schema and reference descriptors

[AI prompt contract](ai-prompts.md) defines the conversation and output behavior. `core/ai/prompt-schema.ts` recursively renders the active fields, choices, conditions, child templates, and current records for both tab interviews and scoped form prompts. `interview-prompt.ts` gathers information across the whole current tab; `form-prompt.ts` requests complete supported answers for a section/group/record/nested-item scope. `prompt-builder.ts` exposes their entry points, and `prompt-contract.ts` supplies output/reference rules. Do not maintain separate field templates or update-only rules in feature guidance.

- `page.ai.task`: the tab's concrete deliverable and boundary. The interview checks every applicable item against this finish line. SRS tasks live in `features/software-requirements/workflow/prompt-tasks.ts`; other tabs fall back to their description or label.
- `page.ai.interviewGuidance`, `ai.definitions`, and `ai.orientation`: domain discovery cues and essential definitions. Orientation uses `focus`, an optional hypothetical `example`, and `requiredDefinitions`; examples never establish project facts. Explain central terms naturally rather than using scripted headings. Human guides are not copied.
- `page.ai.draftingGuidance`, `section.ai.draftingGuidance`, and `field.aiHint`: domain information for formatting the declared form scope. They must not ask for a new interview, override the scope, require only changed fields, or introduce undeclared child fields.
- `field.fields`: the complete recursive child contract for `nested-records`. Declare child labels, types, choices, references, and conditions; a collection label alone is not sufficient.
- `field.reference`: the live selector descriptor. Copied prompts list available IDs and labels; a single-record selector takes exactly one ID, while `record-links` takes comma-separated IDs. Unavailable saved links are preserved as context, not advertised as valid choices.
- `field.referenceFormat`: `ids` (comma-separated exact IDs), `source-locators` (exact source IDs or supplied external document/section/date locators), or `paths` (existing use-case ID and recorded path/step). The builder recognizes existing `*References` fields as a compatibility fallback; declare the format explicitly for new fields with different names or semantics.
- `field.showWhen`: conditional possibilities appear with their conditions in the copied schema. Requested answers follow the applicable branch. `editable: false` and automatically managed parent links remain context, while `includeInPrompt: false` excludes internal fields.

The current-tab inventory includes every eligible record, including blank added entries, with full current answers and child inventories. It is not truncated to save tokens. Earlier connected-project evidence and calculated financial enrichment are omitted from interviews; form prompts retain complete selected evidence and CBA/FSA results. Neither tooltip text nor diagram payloads enter a prompt.

Reference rules constrain the current manual-entry AI answers, not stored data. A schema-driven `dsrs-form` v1 parser/import backend now exists for a later structured paste workflow, but current copy controls are not connected to it yet; see [structured AI form responses](ai-form-responses.md). Unsupported required inputs in today's formatted-answer prompts stay blank with a separate Needs information note; only the guided interview asks questions. Preserve user-authored values and use existing consistency reviews for corrections. Optional findings require no invented prose, and missing evidence never establishes non-applicability or a no-change outcome. See [guided-interviews.md](guided-interviews.md) for manual cases.


## Grouped canonical record editing

A repeatable section can declare `parent` to organize its existing collection beneath related records without storing nested copies:

```js
parent: {
  fieldKey: "primaryActorId",
  label: "Primary actor",
  reference: { dataPath: ["softwareRequirementsSpecification", "records", "actors"], displayId: { prefix: "SRS-ACT-", padding: 3 }, labelField: "name" },
  recordFilter: { key: "status", in: ["Candidate", "Confirmed", "Needs clarification"] },
  allowUngrouped: false,
  ungroupedTitle: "Use cases needing a primary actor"
}
```

`recordFilter` here controls eligible parents; the outer repeatable filter still controls children. `fieldKey` remains a real canonical field, retained in previews and evidence. Mark its field `completion: false` because grouped creation supplies it. Use stable IDs for both sides. Preserve collection defaults and compatibility at the normal workspace boundary.

Optional `description`, `emptyText`, `ungroupedDescription`, `ungroupedAddLabel`, and `unassignedOption` customize the guided UI. `allowUngrouped` permits adding records without a parent where the domain allows it. `preserveFreeform` retains the relationship's existing free-text/multi-record semantics in the ungrouped area; `relationshipLabel` names that explicit-save input. Unknown links are retained until the user deliberately replaces them.

Grouped copy prompts combine the original category/kind filter with the parent constraint and treat the automatic parent input as context. Whole-section prompts return complete supported entries grouped by association; tab interviews track coverage for every eligible group's records. Neither requests redundant parent-field entry. These descriptors do not infer approval, cascade deletion, or alter document placement. See `record-relationships.md` for the app-wide decisions and manual checklist.


## Authoring controls

`field.optional` renders a small reveal control for genuinely optional supporting content. `showWhen: { key, notEmpty: true }` exposes preserved content only when populated. `page.omitEmptyFields` omits blank/conditional fields from list previews. `repeatable.completionMode: "all-required"` evaluates visible editable fields marked `completion: true` or listed in `completionFields`, excluding fields marked `completion: false`, optional fields and hidden metadata. Simplified planning documents and SRS stages display numeric progress alongside their guidance prompt.

`type: "record-links"` with a `reference` descriptor provides named multi-selection, stores comma-separated IDs, and retains unavailable saved links. Reference labels are resolved for previews without mutating saved values. See `docs/srs-simplification.md` for the feature's active authoring and saved-workspace contracts.

Optional field disclosure summaries provide the visible title; their inner controls use `hideLabel` to retain accessible labels without displaying the title twice.

### Document dates

Document metadata date fields declare `dateDocument` with their owning top-level state key. An empty manual value displays that document’s `_lastModified` date in local time; entering a date or selecting **Today** stores an override. **Auto** clears the override. Other date fields (such as evidence dates) offer Today but do not assume the document date.

`app/document-date-tracker.ts` stamps changed document content and carried shared sections, excluding its own timestamps. A feature may declare `dateDependencies` for other documents whose calculated content it displays (FSA depends on CBA). Opening a workspace retains its saved timestamps; missing timestamps start from the workspace’s saved modification time. Navigation and downloads do not themselves change dates.

Manual verification: edit SR and confirm its automatic date; enter an older manual date and edit again; try Today and Auto; save/reopen; inspect CBA/FSA Analysis Date and EB/SRS preview dates. Source dates should remain blank until supplied.

### Basic narrative Markdown

Textarea fields accept plain-text Markdown: paragraphs, line breaks, bullet/numbered lists (including indented lists), bold, italics, inline code and HTTP(S)/mailto links. Generic document previews and CBA narrative output render it, including print/PDF. Raw HTML is escaped. Dates, numbers, choices and reference inputs do not use Markdown; `markdown: false` opts a textarea out. No stored-data conversion or rich clipboard handling is involved. The small renderer lives in `core/formatting/markdown.ts`; shared output uses `components/preview/MarkdownText.ts` and `styles/markdown.css`.

Manual check: enter paragraphs and nested bullets in CR Excluded or deferred; inspect preview and print/PDF, save/reopen, and try literal HTML text. Also inspect repeated narrative entries and CBA notes. No automated checks run.
