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

The CR document uses three distinct record kinds in the existing `records` store; IDs are UUIDs, and entries are additive rather than one mutable document body:

- `cr.source`: `{ version: 1, type: "text", body, createdAt }` for exact pasted text, or `{ version: 1, type: "file", name, mediaType, size, base64, createdAt }` for unmodified uploaded file bytes. A saved original is not overwritten by interpretations or later interviews.
- `cr.ai-interpretation`: `{ version: 1, body, createdAt }` for AI-produced drafts pasted by the user. These are explicitly labeled as unverified interpretations.
- `cr.interview-note`: `{ version: 1, body, createdAt }` for client clarifications entered after an interview.

Each record is validated when read by the CR model; no migration or extra database object store is required. The `.dsrs` JSON export includes all three record kinds, including original file bytes. File uploads are saved as base64 inside the portable workspace, not linked to temporary browser file paths. Because the portable import has a 128 MiB parsing safeguard, CR refuses a new entry if the resulting backup would exceed that size.

The AI interpretation action copies a prompt into the clipboard; there is **no built-in AI service or automatic upload**. Pasted text and UTF-8 text documents are included verbatim in the prompt; PDF, Word, and other non-text attachments must be supplied separately in the AI chat. AI output is manually pasted back as a separate record. Other SRS documents are independent and unchanged.
