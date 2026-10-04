# AI-generated diagrams

Every editable `diagram-file` keeps Upload DrawIO/XML/PNG/JPEG and adds **Import AI diagram**. Figure collections also offer import next to batch upload. A section or figure’s existing copy control produces a dedicated diagram-generation prompt. Select use-case links and, for an activity figure, its scenario before copying to narrow the evidence. An empty link selection covers all eligible cases. The section control generates one combined diagram; a figure control narrows it to that figure’s scope.

Paste the entire AI response into Import AI diagram, or use the AI code block’s copy button to paste just its JSON object, then import. Both formats go through the same graph, reference and file validation. A successful import creates the same editable DrawIO `file` payload as an upload. Field-level import replaces only the file and preserves the FIG ID, title, caption and links; collection-level import creates a figure through the existing stable-ID path. Errors leave the saved file intact. Figure metadata remains manually editable. Inspect the resulting diagram and correct its source records when semantics differ.

## Semantic response contract

Copy prompts request exactly one fenced `dsrs-diagram` JSON block, without prose. The importer also accepts that block’s bare JSON object to support code-block copy buttons. Surrounding prose, multiple objects/blocks and unrelated code fences are rejected. The object has exactly four keys:

| Key | Compact entries |
|---|---|
| `t` | Registered diagram type: currently `use-case` or `activity` |
| `g` | `[localId, labelOrReference]` groups |
| `n` | `[localId, kind, labelOrReference, optionalGroupId]` nodes |
| `e` | `[fromLocalNodeId, toLocalNodeId, optionalKind, optionalGuardOrCondition]` directed edges |

All tuple entries are strings. Omit optional trailing entries; do not use null. Local IDs must start with a letter and contain at most 80 letters, digits, dots, underscores or hyphens. Group/node IDs are unique within a response. Edges reference nodes. Limits are 16 groups, 160 nodes and 320 edges; plain-text labels/guards are at most 500 characters. Coordinates, dimensions, styles, XML, binary data, images and data URLs have no place in the IR.

Use canonical IDs as labels wherever available: the app resolves `SRS-ACT-*` and `SRS-UC-*` to their current saved names, and `@system` to the saved project name. Those labels become a snapshot in the generated file, just as in an uploaded diagram. Unknown/retired references require correction or a fresh prompt. The graph never creates or edits canonical actor/use-case records.

Example use-case response (IDs below must exist in the actual workspace):

```dsrs-diagram
{"t":"use-case","g":[["system","@system"]],"n":[["a","actor","SRS-ACT-003"],["u","use-case","SRS-UC-007","system"]],"e":[["a","u"]]}
```

Use-case maps require one system boundary, with actor nodes outside it and use-case ellipses inside it. Association is the default edge; include goes from including case to required reused case, extend from optional case to base, and generalization from child to parent of the same kind. Include/generalization cycles and self relationships are rejected. The generator owns UML shapes, dashed stereotype connectors and hollow generalization arrows.

Activity workflows support start/end, actions, decisions, alternative merges, concurrent forks/joins and object nodes. Groups become responsibility swimlanes; unassigned nodes use a shared lane. `flow` is the default edge, with decision guards in the fourth entry. `object` edges touch object nodes. One start and at least one end are required; every control node must be reachable from the start and have a path to an end. Decisions require guarded alternatives, forks require concurrent outputs, and joins/merges require multiple inputs. The layout ranks paths, collapses loops for ordering, separates parallel nodes, sizes labels and routes backward flow outside the lanes. AI supplies none of these coordinates.

## Implementation and persistence

| Concern | Owner |
|---|---|
| Transient graph/config/type interfaces | `src/core/artifacts/diagram-graph.ts` |
| Strict response parsing and generic graph checks | `diagram-ir.ts` |
| Canonical label resolution and selected scalar evidence | `diagram-context.ts` |
| Registered semantic validators/layouts | `diagram-types.ts`, `diagram-use-case.ts`, `diagram-activity.ts` |
| Native XML generation and upload-reader handoff | `diagram-drawio.ts` |
| Existing file validation and shared limits | `diagram-files.ts` |
| Dedicated prompt and normal formatter routing | `src/core/ai/diagram-prompt.ts`, `form-prompt.ts` |
| Reusable paste/import UI | `src/components/diagrams/DiagramAiImportControl.ts` |
| SRS-specific source/coverage declarations | `src/features/software-requirements/phase-three/diagram-config.ts` |

Artifact paths in this table without a directory prefix are relative to `src/core/artifacts/`. A new diagram type provides a type descriptor with node/edge kinds, contract, semantic validator and deterministic layout, then registers it in `diagram-types.ts`. Its feature supplies a declarative `field.diagram` config selecting reference catalogs, scalar evidence fields, scope links and label aliases. Core never imports feature modules. Import, storage, media rendering and printing remain shared.

Generation prompts select evidence through that config rather than dumping form fields or broad connected sources. Use-case maps receive selected identities, participants and relationships. Activity figures receive selected behavior and responsibilities plus the scenario. Diagram file metadata, XML/image contents and unrelated figure fields are excluded. Ordinary interviews and metadata prompts continue to summarize files without their contents. Connected evidence and financial enrichers bypass the dedicated generation prompt.

The generator emits uncompressed, editable `mxfile`/`mxGraphModel` XML using the [official DrawIO format and style reference](https://www.drawio.com/docs/reference/diagram-generation/style-reference/). It passes the XML through `readDiagramArtifact`, including the existing `validateDrawioXml`, and stores `artifactKind: "DrawIO source"`. Generated and uploaded diagrams share the 2 MB per-file and 3 MB collection limits, including retired figures and both diagram stages; replacement excludes only the replaced file. No graph IR, second artifact model, alternate preview, migration or workspace-format change is introduced. Existing `DiagramMedia`, placed/document previews, printing, download and `.dsrs` persistence consume the same file payload.

## Manual verification — not run

1. Upload DrawIO/XML, PNG and JPEG; batch upload across both stages. Confirm existing behavior and FIG IDs still work.
2. Select a map’s cases, copy its figure prompt and inspect the evidence. It should contain just the selected cases, linked actors, applicable directed relationships and system label. Paste a valid response; inspect actor shapes, boundary, use-case ellipses and relationship arrow directions.
3. Select an activity case and scenario. Copy, generate and import a workflow with guarded alternatives, lanes and a supported fork/join. Inspect path order, guard labels, non-overlapping shapes and loop routing where applicable.
4. Import the same graph as a fenced dsrs-diagram response and as bare JSON copied from its code block; both should create the same diagram. Paste prose, multiple objects/blocks, malformed JSON, layout/style entries, duplicate IDs, unknown references, wrong types, missing endpoints or unguarded decisions. Confirm useful errors and preservation of the existing file. Correct the text and retry.
5. Replace an uploaded/generated file through both upload and import. Confirm the same FIG ID, caption and links, refreshed preview and downloadable editable `.drawio` source.
6. Approach the shared 3 MB limit using figures from both stages, including retired figures. Confirm both import and upload reject additions that exceed it, while valid replacement excludes the replaced file.
7. Save/reopen `.dsrs` and inspect partial/document preview and print. Confirm the generated file renders through the existing DrawIO viewer and retains its source. Download and open it in diagrams.net to confirm editable shapes/connectors. Existing multi-page upload/print behavior remains.
8. Copy ordinary interviews and metadata scopes. Confirm stored XML/images never appear; diagram-generation prompts must not acquire connected-evidence or financial appendices.

Focused regression cases are in `tests/diagram-generation.test.mjs`. They have not been run; browser XML validation, rendering, import UI and print behavior need the manual checks above.
