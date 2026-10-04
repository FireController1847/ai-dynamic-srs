import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { stage, reviewSection, recordSection, text, choice, recordsPath } from "./shared.ts";
import { catalogEvidence, casualSource, mapSource } from "./evidence.ts";
import { useCaseDiagramConfig, activityDiagramConfig } from './diagram-config.ts';

function figures(id: string, title: string, target: string, group: string, extraFields: Field[] = []): Section {
  return recordSection(id, title, target, group === "use-case-map" ? 3 : 1, "artifacts", "FIG-", "title", [
    text("artifactGroup", "Diagram group", { type: "text", default: group, hidden: true, editable: false, completion: false, includeInPreview: false, includeInPrompt: false }),
    text("title", "Figure title", { type: "text" }),
    { key: "file", label: "Diagram file", type: "diagram-file", default: null, collectionPath: [...recordsPath, "artifacts"], artifactField: "file",
      diagram: group === 'use-case-map' ? useCaseDiagramConfig : activityDiagramConfig,
      aiHint: "Upload DrawIO/XML/PNG/JPEG or use the figure/section copy prompt and paste its dsrs-diagram response into Import AI diagram. Stored file contents remain omitted from prompts." },
    text("caption", "Caption / what this figure demonstrates"),
    text("useCaseReferences", "Use cases shown (IDs)", { type: "text", placeholder: "SRS-UC-001, SRS-UC-002" }),
    text("actorReferences", "Actors shown (IDs)", { type: "text", placeholder: "SRS-ACT-001, SRS-ACT-002" }),
    ...extraFields,
    choice("figureStatus", "Figure review", ["Draft", "Reviewed with differences", "Reconciled"]),
    text("figureFindings", "Differences found and changes made", { placeholder: "Identify missing or inconsistent records. Cite SRS-ISS IDs for unresolved questions." })
  ], {
    displayId: { prefix: "FIG-", padding: 4 }, itemLabel: "Figure", addLabel: "Add figure details",
    artifactField: "file", completionMinimum: 1, recordFilter: { key: "artifactGroup", equals: group }
  });
}

export const useCaseMapStage = stage(
  "srs-behavior-use-case-map", "useCaseMap", "Use-Case Map",
  "Upload or generate a use-case diagram, connect it to the catalog, and reconcile its actors, boundary, and relationships.",
  ["functional-behavior.use-case-model"], [...catalogEvidence, casualSource],
  [
    reviewSection("map-review", "Use-Case Map Review", "functional-behavior.use-case-model", "Check every actor association and use-case relationship against the canonical records."),
    figures("use-case-figures", "Use-Case Figures", "functional-behavior.use-case-model", "use-case-map", [
      text("boundaryNotes", "Subject boundary and package coverage"),
      text("relationshipReferences", "Relationships shown (IDs)", { type: "text", placeholder: "SRS-REL-001, SRS-REL-002" })
    ])
  ],
  "Use the catalog's actors, use cases, and directed relationships. Record a meaningful figure title, caption, IDs covered, and discrepancies. The diagram is evidence to compare with the records, not a replacement catalog. Do not infer associations from a filename or claim a visual review without the supplied image.",
  [
    { title: "Draw the catalog", text: "Place use cases inside the subject boundary and actors outside it. Add associations and justified include/extend/generalization relationships." },
    { title: "Upload controlled figures", text: "Upload .drawio/.xml or PNG/JPEG files, or copy the figure/section AI prompt and import its dsrs-diagram response. The app generates editable DrawIO XML. Every file receives a stable FIG ID; replacing its file retains that identity." },
    { title: "Compare both ways", text: "Check for catalog cases missing from the map and diagram elements missing from the catalog. Correct the source records before marking the figure reconciled." }
  ]
);

export const activityWorkflowsStage = stage(
  "srs-behavior-activity-workflows", "activityWorkflows", "Activity Workflows",
  "Model selected use-case scenarios to expose missing decisions, responsibilities, concurrency, and object flows.",
  ["analysis-models.activity"], [...catalogEvidence, casualSource, mapSource],
  [
    reviewSection("activity-review", "Activity Model Review", "analysis-models.activity", "Use process walkthroughs to challenge the casual stories before writing detailed event flows."),
    figures("activity-figures", "Activity Figures", "analysis-models.activity", "activity-workflow", [
      text("scenario", "Scenario and start/end boundary"),
      text("responsibilities", "Responsibilities or swimlanes checked"),
      text("decisions", "Decisions and guard conditions checked"),
      text("parallelism", "Parallel paths and joins (when applicable)"),
      text("objectFlows", "Objects or information passed between activities")
    ])
  ],
  "Select a supported use case and scenario. Identify activities, decisions and guards, initial/final nodes, control and object flows, and forks/joins only where relevant. Keep a logical model without prescribing screens or architecture. Record findings that must be reflected in casual and detailed descriptions. Uploaded diagram bytes are not available in the text prompt.",
  [
    { title: "Choose a scenario", text: "Select a complex or uncertain path from the casual story; state the diagram's start and end." },
    { title: "Model the work", text: "Assign actions to responsible roles, label decisions with guards, and show meaningful object flows. Check for actions with no incoming or outgoing path." },
    { title: "Feed discoveries back", text: "Record omissions and conflicts, revise the casual story, and use the resulting paths in the detailed description." }
  ]
);
