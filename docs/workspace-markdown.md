# Markdown workspace context

The arrow beside **Download WIP** opens **Download MD**. It downloads an uncompressed, UTF-8 `<project-name>.md` file containing the current in-memory workspace, including edits that have not yet reached autosave. The main Download WIP button continues to download the complete `.dsrs` backup.

The Markdown follows the existing navigation order: document tabs, nested phases/stages, form sections, records and field titles, with navigation codes such as 02.3 and 03.1 retained. It gathers saved information for use as GPT workspace context. Finished SRS document placement, cover pages, print previews, generated calculations, human guides and AI instructions are not used to assemble this export.

## Content and deduplication

- Deduplicate by canonical saved field location, including `section.dataPath`. Prefer a matching stage's editable field over a carried read-only copy, then use navigation order. Do not deduplicate unrelated answers merely because their text is identical.
- Shared records stay shared. Record IDs identify later additions under other stages without repeating already-exported fields. For example, a use case's identity appears in Use Cases and its short description in Casual Descriptions. Preserve IDs and references exactly; no records are created or changed.
- Include nonempty current saved values, including zero, false, optional answers, inactive answers, retired records, nested children, references and actual Notes edit history. Values may include schema defaults; the workspace does not track whether every default was explicitly confirmed.
- Preserve undeclared/older saved answers under **Additional saved information** near their record or navigation node. Unrecognized root sections appear under **Additional saved workspace information**. Internal keys beginning with `_`, empty placeholders and record bookkeeping flags are omitted; retirement is labeled on the record.
- Keep authored prose and Markdown intact in answer blockquotes so authored headings do not disturb the export's navigation hierarchy. Structural titles are escaped. Answers are not truncated.
- Include figure IDs, titles, captions, linked record IDs and file metadata. DrawIO XML and PNG/JPEG bytes stay in the `.dsrs` backup and are excluded from Markdown. The export has no separate diagram representation or stored copy of its contents.

The exporter is read-only. It does not change workspace format 2, saved data, IDs, completion, approval, navigation selection or the last-saved timestamp. It does not require a migration and Markdown is not a workspace import format.

## Owners

`components/controls/WorkspaceDownloadControl.ts` owns the Vue disclosure and its keyboard/outside-click behavior. `app/app.ts` captures the current snapshot and reports download status. `core/workspace/workspace-files.ts` downloads the file using the same browser Blob mechanism as WIP downloads.

`core/workspace/markdown-index.ts` indexes field ownership from the supplied navigation schemas; `markdown-values.ts` renders saved values; `workspace-markdown.ts` assembles the navigation tree and preserved legacy answers. Core remains feature-neutral and never imports feature schemas or preview components.

## Manual review

1. Open the arrow beside Download WIP, choose Download MD and inspect the filename and UTF-8 content. Confirm the main button still downloads an importable `.dsrs` file.
2. Edit answers across several tabs and download without waiting for autosave. Confirm navigation order and current text, zero amounts, optional answers and nested Notes references/history.
3. Refine the same use case across Phases 2 and 3. Confirm identity/description fields occur once at their authoring headings with stable IDs. Check a deferred/retired record and an older saved answer too.
4. Include uploaded/generated DrawIO and an image figure. Confirm their IDs, captions and metadata appear without XML/base64 file content.
5. Try keyboard Tab/Enter, Arrow Down, Escape, outside clicks and phone width. Confirm visible focus, dismissal and an unclipped dropdown. Downloading MD must not mark a new autosave or change completion.

Regression cases are in `tests/workspace-markdown.test.mjs`; run them only when verification is requested, consistent with `AGENTS.md`.
