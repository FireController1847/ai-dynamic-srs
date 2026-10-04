# Structured AI form responses

Dynamic SRS defines a versioned JSON interchange format for AI-authored form values. The backend is implemented in `src/core/ai/form-response.ts` and `form-response-import.ts`. It is intentionally not connected to the current copy/paste UI yet; existing form prompts still return formatted answers for manual entry until a later UI integration changes that workflow deliberately.

## Format

Version 1 uses `format: "dsrs-form"` and merge-only semantics:

```json
{
  "format": "dsrs-form",
  "version": 1,
  "page": "schema-page-id",
  "section": "schema-section-id",
  "mode": "merge",
  "fields": {
    "fieldKey": "value"
  },
  "needsInformation": []
}
```

`page` and `section` are stable schema IDs, not visible titles or section numbers. The importer rejects a response aimed at a different page or section.

`null` means the AI could not support a value and the saved value must be preserved. Omitted fields are also unchanged. Version 1 never replaces an entire form or deletes omitted records.

## Repeatable sections

A whole repeatable section uses `records` instead of `fields`:

```json
{
  "format": "dsrs-form",
  "version": 1,
  "page": "schema-page-id",
  "section": "schema-section-id",
  "mode": "merge",
  "records": [
    {
      "id": "EXISTING-001",
      "fields": {
        "name": "Existing record"
      }
    },
    {
      "fields": {
        "name": "New record"
      }
    }
  ]
}
```

Existing records keep their stable ID. New records omit `id` or use `id: null`; the application assigns the lowest reference-safe ID through the normal record lifecycle. The importer does not accept an invented ID for a new record.

For a grouped repeater whose parent relationship is app-managed, a new record supplies `parent` beside `fields`. The value must be an available parent ID. Existing records do not use `parent` in version 1, so importing an answer cannot silently move them between groups.

A response for one existing repeatable record can instead use top-level `record` plus `fields`.

## Nested records

A nested-record field is represented as an array of record objects:

```json
{
  "fields": {
    "steps": [
      {
        "id": 1,
        "fields": {
          "action": "Preserve and update the existing nested item"
        }
      },
      {
        "fields": {
          "action": "Create a new nested item"
        }
      }
    ]
  }
}
```

Nested IDs are positive numeric saved IDs. Missing IDs create new items through the existing nested-record factory. Omitted nested records are never deleted.

A response aimed at one existing nested item may include a top-level `path` containing nested field/ID pairs, for example `["steps", 2, "exceptions", 1]`. This lets a future paste control verify that a response belongs to the exact nested scope that requested it.

## Validation and safety

The importer validates the entire response before changing form state. It rejects unknown schema keys, read-only or hidden fields, fields excluded from AI prompts, inactive conditional branches, unsupported option values, unavailable references, invalid dates/numbers, unavailable record IDs, duplicate nested IDs, and new empty records.

Select and checkbox values are normalized to the schema's stored option values. Live record references are resolved against the current document model. `record-links` accepts either a JSON array of valid IDs or the app's comma-separated stored representation. Period values support `null` per year to preserve an existing value.

`diagram-file` is explicitly outside this protocol. AI-generated diagrams use their separate artifact pipeline: `dsrs-diagram` for one figure and `dsrs-diagrams` for an ordered repeatable-section batch. Neither response is a `dsrs-form` payload.

The parser accepts raw JSON and a single surrounding `json` or `dsrs-form` code fence for clipboard robustness. Unknown envelope keys and unsupported format versions are rejected instead of being ignored.

## Schema-derived contract

`buildAiFormResponseContract` derives an envelope and field types from the same live schema used by the form. `renderAiFormResponseContract` renders a compact prompt-ready contract. This avoids maintaining a second handwritten list of field keys, choices, references, nested children, or grouped-parent choices.

These helpers are backend-only for now. A future UI change can attach the rendered contract to scoped AI prompts and pass pasted text to `applyAiFormResponse`, with an `AiFormImportExpectation` to enforce the exact record/nested/field scope of the control that requested the answer.

## Versioning

`dsrs-form` response version 1 is independent from the application semantic version and the saved workspace `FORMAT_VERSION`. The structured response is transient clipboard/import data and is not stored in `.dsrs` files.

Adding this dormant backend does not change current user-visible behavior, so it does not independently bump the application version. Enabling the structured copy/paste workflow in the UI is a separate user-facing capability and should be versioned under the normal application version policy.
