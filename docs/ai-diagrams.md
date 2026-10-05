# AI-generated diagrams

Dynamic SRS supports two AI diagram scopes that share the same semantic graph and DrawIO artifact pipeline but have different response envelopes:

| Scope | Response | Import behavior |
|---|---|---|
| Repeatable diagram section | One ordered `dsrs-diagrams` batch | Validate the entire batch first, then create one stable-ID figure record per returned figure in order |
| Individual figure | One `dsrs-diagram` graph | Replace only that figure's `file`; preserve its FIG ID, title, caption and links |

Upload DrawIO/XML/PNG/JPEG remains independent and unchanged. Uploaded files may still supply a filename-derived initial title. Generated artifact filenames are implementation details and never define an AI-created figure record's user-facing title.

The AI supplies semantics only. It never supplies coordinates, dimensions, styles, DrawIO XML, binary data or data URLs. The application resolves canonical references, validates graph semantics, chooses deterministic layout, generates editable DrawIO XML and stores the same file payload used by ordinary uploads.

## Section-level batch contract

A repeatable diagram section prompt requests exactly one fenced `dsrs-diagrams` JSON object, or the importer may accept the same bare JSON object copied from a code block:

```dsrs-diagrams
{
  "figures": [
    {
      "title": "Local Account, Discovery, and Participation",
      "caption": "Shows local account, discovery, and participation behavior.",
      "useCaseReferences": "SRS-UC-001, SRS-UC-002",
      "actorReferences": "SRS-ACT-001",
      "graph": {
        "t": "use-case",
        "g": [["system", "@system"]],
        "n": [
          ["local", "actor", "SRS-ACT-001"],
          ["register", "use-case", "SRS-UC-001", "system"],
          ["discover", "use-case", "SRS-UC-002", "system"]
        ],
        "e": [
          ["local", "register"],
          ["local", "discover"]
        ]
      }
    }
  ]
}
```

The root contains only `figures`. Figure metadata is declared by the active diagram config rather than hard-coded into the generic parser. Use-case figures currently support `title`, optional `caption`, `useCaseReferences`, `actorReferences`, and optional `relationshipReferences`. Activity figures declare their own compact metadata, including scenario where required. Authored figure metadata is not subject to the semantic graph's 500-character label/guard limit; narrative metadata such as an activity scenario may use its natural authored length. The overall pasted response-size limit and control-character validation still apply.

The section prompt includes current saved figure metadata and the selected semantic evidence. It must preserve figure partitions already established by the interview/conversation or current records: one agreed figure becomes one returned figure, in the same order, with title capitalization preserved. It must not collapse all eligible cases into one graph, nor invent extra figures merely to reduce graph size. Intentional overlap between figures is allowed when it expresses the model—for example, repeating parent use cases in a delegated-management figure so generalization pairs are visible.

Reference metadata and graph contents must agree. For use-case batches, `useCaseReferences` exactly matches the canonical use-case nodes in that figure's graph, and `actorReferences` exactly matches its canonical actor nodes. IDs outside that figure's selected evidence are rejected.

Batch import is atomic at two boundaries. First, every figure metadata object and graph is parsed and validated before generation proceeds. Then every DrawIO payload and the aggregate shared-file size are validated before the component emits the batch. Finally, all stable-ID records are planned before the canonical figure collection is mutated. A bad later figure therefore cannot leave earlier figures half-imported.

Section-created figure titles come from the semantic `title` in the batch response, not from generated filenames. The app preserves the supplied capitalization exactly apart from surrounding whitespace normalization.

## Individual figure contract

An individual figure prompt retains the original compact `dsrs-diagram` response:

```dsrs-diagram
{"t":"use-case","g":[["system","@system"]],"n":[["a","actor","SRS-ACT-003"],["u","use-case","SRS-UC-007","system"]],"e":[["a","u"]]}
```

The importer also accepts the block's bare JSON object. Surrounding prose, multiple objects/blocks and unrelated code fences are rejected.

Individual import generates a new editable DrawIO payload and replaces only the existing record's `file` value. The figure's stable ID, title, caption, coverage links, review state and other metadata are not recreated or overwritten.

## Semantic graph IR

Every figure graph uses exactly four keys:

| Key | Compact entries |
|---|---|
| `t` | Registered diagram type: currently `use-case` or `activity` |
| `g` | `[localId, labelOrReference]` groups |
| `n` | `[localId, kind, labelOrReference, optionalGroupId]` nodes |
| `e` | `[fromLocalNodeId, toLocalNodeId, optionalKind, optionalGuardOrCondition]` directed edges |

All tuple entries are strings. Omit optional trailing entries rather than using null. Local IDs must start with a letter and contain at most 80 letters, digits, dots, underscores or hyphens. Group/node IDs are unique within a graph. Edges reference nodes. Limits are 16 groups, 160 nodes and 320 edges per figure; plain-text labels/guards are at most 500 characters.

Use canonical IDs as labels wherever available. The app resolves current `SRS-ACT-*` and `SRS-UC-*` names and `@system` to the saved system label. Reference resolution is scoped to the selected figure evidence; a current record outside that figure's declared scope is not silently accepted. Unknown, retired or out-of-scope references require correction or a fresh prompt.

The semantic IR is transient. It does not create or edit canonical actors, use cases or relationship records, and it is not stored in `.dsrs`.

## Use-Case Diagram layout

Use-case graph validation requires exactly one system boundary, actor nodes outside it, and use-case nodes inside it. Associations connect actors to use cases. `include` goes from the including case to mandatory reused behavior, `extend` goes from optional behavior to its base, and `generalization` goes from child to parent of the same node kind. Include/generalization cycles and self-links are rejected.

The use-case layout is deterministic and relationship-aware:

- Relationship-connected use cases are kept as local blocks rather than scattered through a fixed three-column grid. Two-node generalization components place child and parent adjacently.
- Column count grows with graph size, capped to keep ellipses readable. Case rows/columns reserve explicit connector gutters and the system boundary grows from actual content.
- The highest-degree actor is anchored on the left. Other actors are distributed between left and right based on their connected cases and side load; when multiple actors exist, the layout avoids putting every actor on the same side.
- Actor vertical position follows the median center of its connected use cases, then collision resolution preserves non-overlap. Actors remain outside the system boundary.
- Associations use explicit side anchors and routed gutter waypoints instead of delegating the whole connector network to generic orthogonal routing. Use-case relationships choose horizontal/vertical anchors when aligned and relationship gutters otherwise.
- Boundary title space, use-case ellipses and actor labels reserve separate vertical regions. Page size derives from the final boundary and actor extents.
- Relationship labels use a readable background; include/extend retain UML stereotypes and generalization retains a hollow arrow.

AI never influences these coordinates. The same semantic graph always produces the same editable DrawIO layout.

## Activity diagrams

Activity workflows retain the existing semantic/layout pipeline. They support start/end, actions, decisions, alternative merges, concurrent forks/joins and object nodes. Groups become responsibility swimlanes; unassigned nodes use a shared lane. `flow` is the default edge, with decision guards in the fourth entry. `object` edges touch object nodes.

One start and at least one end are required; every control node must be reachable from the start and have a path to an end. Decisions require guarded alternatives, forks require concurrent outputs, and joins/merges require multiple inputs. The application ranks paths, separates parallel nodes, sizes labels and routes backward flow outside lanes. AI supplies none of those coordinates.

## Validation, files and persistence

Generated graphs pass through the registered semantic validator, deterministic layout and native XML generator. The XML then goes through the same `readDiagramArtifact` and `validateDrawioXml` path as an uploaded DrawIO source.

Generated and uploaded diagrams therefore share:

- `artifactKind: "DrawIO source"` for generated XML.
- 2 MB per-file and 3 MB shared collection limits, including retired figures and both diagram stages.
- The existing `file` payload and `.dsrs` persistence shape.
- `DiagramMedia`, document/placed previews, printing, source download and diagrams.net editing.
- Existing retirement and reference-safe FIG ID behavior.

A generated source filename such as `use-case-figure-1.drawio` is not a semantic title. Section batch creation uses the batch figure title. Individual replacement does not touch the owning record's title. Normal uploads retain their existing filename-derived initial-title behavior.

Workspace format remains unchanged.

## Implementation ownership

| Concern | Owner |
|---|---|
| Transient graph/config/batch-metadata interfaces | `src/core/artifacts/diagram-graph.ts` |
| Strict single-graph parsing | `diagram-ir.ts` |
| Strict ordered section-batch parsing and metadata/scope validation | `diagram-batch.ts` |
| Canonical label resolution and selected scalar evidence | `diagram-context.ts` |
| Registered semantic validators/layouts | `diagram-types.ts`, `diagram-use-case.ts`, `diagram-activity.ts` |
| Native XML generation and single/batch upload-reader handoff | `diagram-drawio.ts` |
| Existing file validation and shared limits | `diagram-files.ts` |
| Section/figure prompt routing | `src/core/ai/diagram-prompt.ts`, `form-prompt.ts` |
| Paste/import UI | `src/components/diagrams/DiagramAiImportControl.ts` |
| Stable figure record creation after batch validation | `src/components/forms/FormWorkspace.ts` |
| SRS-specific sources, scope and batch metadata declarations | `src/features/software-requirements/phase-three/diagram-config.ts` |

Core artifact code remains feature-neutral. Feature configuration declares which record metadata and reference sources are legal; core does not import SRS modules.

## Focused regression verification

`tests/diagram-generation.test.mjs` contains the semantic/layout regression cases. The CommunityApp-style batch case uses the reported 47-use-case fixture and constructs these six established partitions:

1. **Local Account, Discovery, and Participation** — UC-001–014 and UC-025.
2. **Reviews, Reporting, and Community Moderation** — UC-019–022 and UC-026.
3. **Purchases and Personal Publishing** — UC-023–024 and UC-027–028.
4. **Organization Ownership and Governance** — UC-015–018 and UC-029–037.
5. **Delegated Organization Management** — UC-029–034 and UC-038–043, including the six child/parent generalization pairs.
6. **CommunityApp Support and Administration** — UC-044–047.

The regression checks that the batch parses as six figures in exactly that order with exact titles, rejects out-of-scope actor metadata, produces deterministic editable DrawIO XML, keeps use cases inside the boundary, actors outside it, and actor/use-case rectangles non-overlapping. Multi-actor figures must place actors on both sides; association edges must receive explicit routing points; generalization pairs must remain spatially close.

A separate regression asserts that the whole section prompt requests `dsrs-diagrams` while an individual figure prompt still requests only `dsrs-diagram` and states that only its file is replaced.

Browser-level manual review should additionally import the six-figure response through **Import AI diagrams**, inspect each generated figure in the DrawIO preview/editor, save/reopen the workspace, print the document, and confirm normal file uploads and individual replacement still behave as before. Visual acceptance is based on readable diagrams, not merely valid XML.
