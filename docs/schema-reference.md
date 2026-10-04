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

Pages may also declare an `evidence` descriptor containing source page IDs and curated source sections or fields. Generic evidence renderers use this descriptor for live cross-document context and navigation, while AI prompts receive the same populated source context.

Human help and AI prompts have separate contracts. `section.help` is prose (a string or `{ text }`); the question-mark control displays it as plain text, without fixed questions or headings. Older What/Why/Expectation descriptors render as paragraphs with missing values omitted. The independent copy control uses `section.ai.draftingGuidance`, page `ai` guidance and field `aiHint` values, never tooltip text. A page `guide` supplies a title, summary and `paragraphs`, optional steps and terms for the on-page guide; its visibility is independent of completion.

## Field

Supported field types are:

- `text`, `date`, `number`, and `url`
- `textarea`
- `select`
- `checkbox-group`
- `period-values`
- `nested-records`
- `diagram-file` (validated file payload; rendered media in list previews, metadata only in prompts)

Common field keys include `key`, `label`, `type`, `default`, `columns`, `placeholder`, `helpText`, `aiHint`, `completion`, `includeInPreview`, and `showWhen`.

`editable: false` renders carried context without an input and excludes it from repeatable completion. `hidden: true` hides internal metadata from forms; use `includeInPreview: false` and `includeInPrompt: false` as appropriate as well. A select may declare `reference: { dataPath, displayId, labelField }` for live record choices that save stable IDs.

`diagram-file` fields declare `collectionPath` and `artifactField` for shared storage limits. The payload contains source filename, kind, MIME type, byte count, timestamps, and content. It is not text for the AI to generate. Uploaded data is preserved inside `.dsrs`; original XML and image payloads never enter clipboard prompts.

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

Sections using `PlacedStagePreview` declare `documentTarget` and optional `documentSubsection` and `previewTitle`. They keep all authored fields without a separate preview whitelist. `ai.includeSiblingContext: true` adds neighboring section values to section-copy prompts when those records are needed for the requested answer.


## AI tab and reference contracts

`core/ai/prompt-contract.ts` supplies brief field-update and strict reference rules to section prompts. `prompt-builder.ts` uses the tab's `ai.task`, `ai.definitions`, existing answers and schema-specific AI guidance. Interviews ask for consequential gaps and finish with an inventory and handoff to section prompts. Field prompts then supply exact references and usable updates. Omitted fields mean unchanged, not deleted. Optional empty findings require no prose. Human guide and tooltip content is not prompt input.

- `page.ai.task`: the current tab's concrete deliverable and boundary. SRS task descriptions live in `features/software-requirements/workflow/prompt-tasks.ts` and are attached in `workflow/phases.ts`. Other feature tabs use their description, guide, and existing AI guidance.
- `section.ai.draftingGuidance`: optional section-specific expected output, taking precedence over general help expectations in the prompt.
- `field.reference`: existing live selector descriptor. Copied prompts enumerate its currently available IDs and labels, while requiring a single ID as the answer. Unavailable saved links are not added to that list.
- `field.referenceFormat`: `ids` (comma-separated exact IDs), `source-locators` (exact source IDs or supplied external document/section/date locators), or `paths` (existing use-case ID and recorded path/step). The prompt builder recognizes existing `*References` fields as a compatibility fallback; declare the format explicitly for new fields with different names or semantics.

Reference rules constrain AI output, not stored data: there is no AI import parser or new input rejection in this change. Examples and saved links are not proof that a referenced target exists. Missing/invalid references become focused questions outside reference fields. Preserve user-authored data and use existing consistency reviews for corrections.

Phase 3 review notes and Phase 4 category findings are optional for completion. Status records a no-change result; narrative is reserved for substantive findings or a justified boundary decision. Never treat missing evidence as a confirmed no-change result.

Manual review: copy a tab prompt and a section prompt; confirm their different scopes, concise update instructions, available selector IDs, and reference formats. Try a populated tab, an empty optional category, a missing source ID, and a use case with a detailed exceptional path. Responses should reuse prior answers, leave optional no-op prose blank, ask about missing evidence, and retain necessary flow detail. Automated checks remain user-owned.


### Guided interview orientation

`core/ai/interview-orientation.ts` guides a natural opening: two or three sentences weaving together purpose, essential definitions, and the work ahead, followed by a useful question. These are internal cues, not response headings. Topic changes receive a short explanation only when needed. Ask about concrete work before recommending technical classifications. Final field updates and section-completion prompts retain the concise output contract.

Use `page.ai.orientation.focus` for a tailored starting cue and optional `example` for an illustration used only when helpful. Definitions come from `ai.definitions`, falling back to `orientation.what` when no definitions are supplied. The earlier `orientation.plan` is no longer copied: the tab task and domain guidance already describe the work. Actors & Goals supplies an explicit actor/goal explanation, boundary check, and hypothetical example. Examples must never become assumed project facts. New tabs can reuse the generic orientation and their own AI metadata without duplicating the interview rules.

Manual review: copy a fresh Actors & Goals interview prompt. Its first response should naturally explain actor and goal and ask a concrete, relevant question, without scripted headings or a glossary recital. With the boundary already answered, it should reuse that answer. Later transitions should explain the new focus briefly; final form updates should omit the teaching prose. No automated checks were run for this change.


### Prompt compression boundary

Tab prompts carry the task once, rather than repeating the on-page step list. Interview sections carry expected information rather than three overlapping help blocks. Generic per-field “ask for this information” sentences and repeated interview rules are omitted. These changes shorten instructions without summarizing or truncating authored source records, reference choices, unresolved questions, or detailed paths.

The AI may reuse reliable context in the same conversation. Do not assume a separate chat can access the application's local workspace, hidden memory, or omitted facts. Fresh prompts still include their connected evidence and strict reference rules. No token reduction measurement or automated checks were run.

Manual review: copy Actors & Goals into a fresh conversation, then continue an existing interview. Expect a short natural introduction only for the fresh start, a question about concrete differences between roles, and a reasoned modeling recommendation after the answer. Confirm that final field updates remain concise and exact IDs are still available.

`page.ai.orientation.requiredDefinitions` names terms that must be explained before task questions (Actors & Goals declares Actor and Goal). Definitions remain conversational, without scripted headings. Existing records do not imply that the user knows the terminology; skip an explanation only when it was already given in the current conversation or the user requests that. Manual review: a fresh Actors & Goals interview should define both terms before its first substantive question, even with a populated workspace. No automated checks were run.


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

Grouped copy prompts combine the original category/kind filter with the parent constraint and omit the automatic parent input. Whole-section/tab prompts retain association context and instruct the AI to group answers instead of repeating that field. These descriptors do not infer approval, cascade deletion, or alter document placement. See `record-relationships.md` for the app-wide decisions and manual checklist.


## Authoring 0.3.0 controls

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
