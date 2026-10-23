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

CR edits save automatically after a short (~650 ms) pause in typing. A single compact indicator reports pending edits, saving, saved, and error/conflict states. The editor stays usable while a write completes; writes are serialized, and further edits are saved in order using IndexedDB per-record compare-and-swap revisions. Switching documents first flushes any pending CR edits; a confirmation appears only if saving failed and leaving would discard unsaved work. A browser unload warning remains as a last resort. Concurrent changes or workspace replacement are never silently overwritten. There are no completion gates or manual Save brief button.

Optional original client material remains in the distinct `cr.source` records introduced before the redesign. A text source stores its original `body`; a file source retains original file bytes encoded as `base64`, along with name, media type, size, and timestamp. The source area does not extract or rewrite client statements, and sources do not automatically populate the structured brief. This preserves source fidelity without keeping duplicate editable text. All current records remain included in the existing portable `.dsrs` version 1 format, with its existing 128 MiB import safeguard.

Earlier `cr.ai-interpretation` and `cr.interview-note` records, if present in a previously saved workspace, are preserved as opaque historical records in backup/export. They are no longer displayed, created, or edited in CR. No other document's data is modified, and GN remains the location for meeting/interview notes.

## System Request records

SR stores one structured record of kind `sr.request`, ID `main`, data `version: 1` in the same workspace. Its document metadata is `date` (blank or valid ISO calendar date) and `preparedBy`. Project Sponsor fields are `sponsorOrganization`, `sponsorContact`, `sponsorRole`, and `sponsorDetails`; `businessNeed` is a short narrative string. `requirements` and `specialIssues` are ordered arrays of stable-ID `{ id, text }` entries. `benefits` is an ordered array of `{ id, text, type, target }` entries, with type either `qualitative` or `measurable` and an optional target/timeframe string. These fields are independent of CR and GN; no client claims are auto-populated or considered confirmed. `sr.request` is validated upon loading (including version, unique entry IDs and correct field types); malformed data will not be replaced by an empty record. Its semantic version does not change the .dsrs format version.

Like CR, SR autosaves after 650 ms with per-record revision checks, a retryable error state, a reload action for conflicts, serialized writes, and an unload guard. Navigation flushes the selected document before leaving it. Visiting SR does not create a record until edits are made. The live preview is derived from the unsaved working draft and omits empty sections. Financial calculations and feasibility details remain reserved for CBA and FSA.

## Cost-Benefit Analysis records

The Cost-Benefit Analysis (CBA) has one canonical `cba.analysis` record, ID `main`, version 1. Projection years and annual discount rate start as **null** (unknown); there are no invented financial input defaults. USD is the default reporting currency only. Ordered, stable-ID benefit lines store their method (direct annual amount or annual volume × unit value × percentage change), yearly realization (level or linear ramp to the final year), notes, and sources. Ordered, stable-ID expenses support upfront (year 0), annual, once at a chosen year, and every-N-years schedules. The period and entry lists have no product-imposed maximum; malformed records and duplicate IDs are rejected.

All projections, discounted values, NPV, nominal ROI, benefit/cost ratio, and whole-year payback are **derived**, never stored as a separate source of truth. Missing assumptions or incomplete financial line items suppress summary metrics rather than converting unknown data to zero. The year-0 outlay is undiscounted, subsequent cash flows occur at year-end. Referenced SR business-value statements are read-only and do not automatically populate CBA estimates. The independent CBA record participates in existing CAS-protected IndexedDB autosave and .dsrs v1 backup/restore without a schema or export format bump.
