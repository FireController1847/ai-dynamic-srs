# Local workspace and .dsrs format

## Boundaries
- IndexedDB (`dynamic-srs-data`, database schema **1**) is authoritative for local editing.
- Portable `.dsrs` files are UTF-8 JSON snapshots with `format: "dynamic-srs"`, `version: 1`. That version is independent of database schema and app version.
- The older Dynamic SRS implementation's `.dsrs` v2 is not auto-migrated. An unsupported import is rejected without deleting current data.
- Browser preferences (including the theme) are intentionally excluded from workspace backups. There is no account/server sync.

## Export shape
```json
{
  "format": "dynamic-srs",
  "version": 1,
  "workspace": {
    "id": "workspace-uuid",
    "name": "Untitled workspace",
    "createdAt": "2026-10-23T00:00:00.000Z"
  },
  "records": []
}
```

`records` will contain `{ "kind": "...", "id": "...", "data": <JSON> }` entries when domain models are designed. Record identifiers are unique per kind; no domain kinds are assigned yet. JSON values are validated recursively, with no silent dropping of unrecognized record kinds. The file holds no IndexedDB storage IDs, local revisions, indexes, or schema structures.

## Physical storage
One origin-scoped IndexedDB database:
- `control`: singleton active workspace pointer.
- `workspaces`: metadata and monotonically increasing local revision; internal storage identity differs from portable workspace identity.
- `records`: granular semantic records keyed by `[workspaceId, kind, id]`, indexed by workspace and kind; each record has a CAS revision.

New browser origins create an empty workspace after IndexedDB opens. If opening or reading IndexedDB fails, editing and imports stay unavailable rather than treating the failure as a fresh empty project. Browser eviction or clearing site data can destroy local work; manually download backups.

### Writes, multiple tabs and restores
All future feature writes should use `WorkspaceDatabase` via typed/domain adapters and supply the active storage ID plus expected record revision. Writes compare the active pointer and record revision in the same short transaction. Other tabs get commit notifications via `BroadcastChannel`; snapshot reads use consistent transactions and focus/visibility refresh to recover missed notifications. This **does not** merge simultaneous edits to the same record.

Export assembles a consistent saved snapshot and serializes JSON only on demand. Import validates the entire file (128 MiB JSON parsing safeguard), stages rows under an inactive storage ID in bounded transactions, verifies staged records, and activates them by an atomic compare-and-swap on the active pointer. In-flight old-tab writes cannot change the replacement workspace. Prior active data remains retained for recovery; a future lifecycle policy may clean inactive staging/orphaned data. A new data model needs its own semantic validators, and a future format version/migration only when its interchange contract genuinely changes.

## Client Requirements records

The Client Requirements (CR) document now stores a single structured `cr.brief` record with ID `main` and data version 1. Its fields are `organization`, `context`, `problem`, and `solution` (strings), plus ordered `capabilities` and `boundaries` arrays of `{ id, text }` entries. Each entry has a stable ID, so editing, reordering, and removing items does not change the identity of the others. Blank fields are omitted from the live document preview. The preview is derived from the working brief; it is not another persisted document.

Edits are staged locally until **Save brief** commits the entire small CR record using the IndexedDB per-record compare-and-swap revision. Concurrent edits or workspace replacement never silently overwrite the saved brief. The UI exposes a conflict, allows the user to keep their unsaved work or deliberately reload, and warns when navigating away with unsaved edits. There are no completion gates.

Optional original client material remains in the distinct `cr.source` records introduced before the redesign. A text source stores its original `body`; a file source retains original file bytes encoded as `base64`, along with name, media type, size, and timestamp. The source area does not extract or rewrite client statements, and sources do not automatically populate the structured brief. This preserves source fidelity without keeping duplicate editable text. All current records remain included in the existing portable `.dsrs` version 1 format, with its existing 128 MiB import safeguard.

Earlier `cr.ai-interpretation` and `cr.interview-note` records, if present in a previously saved workspace, are preserved as opaque historical records in backup/export. They are no longer displayed, created, or edited in CR. No other document's data is modified, and GN remains the location for meeting/interview notes.
