import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { followUpGuidance } from "../issue-follow-up.ts";
import { candidateProcessesStage } from "../phase-two/candidate-processes.ts";
import { promptGuidance } from '../workflow/prompt-guidance.ts';

export const recordsPath = ["softwareRequirementsSpecification", "records"];
export const useCaseFields = candidateProcessesStage.sections!.find(({ id }) => id === "candidate-use-cases")!.repeatable!.fields;
export const useCaseReference = { dataPath: [...recordsPath, "useCases"], displayId: { prefix: "SRS-UC-", padding: 3 }, labelField: "name" };
export const activeCases = { key: "disposition", in: ["Candidate", "Ready for elaboration", "Needs clarification"] };
export const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "textarea", default: "", rows: 3, ...extra });
export const choice = (key: string, label: string, options: FieldOption[], extra: Partial<Field> = {}): Field => ({ key, label, type: "select", default: "", placeholder: "Select an option", options, columns: "col-md-6", ...extra });
export const link = (key: string, label: string, reference: Reference, extra: Partial<Field> = {}): Field => ({ key, label, type: "select", default: "", options: [], reference, columns: "col-md-6", ...extra });

export function reviewSection(id: string, title: string, target: string, description: string): Section {
  return {
    id, key: id, title, documentTarget: target, description,
    help: { what: description, why: "Each representation must expose gaps or contradictions in earlier work.", expectation: "Choose an honest review result and cite records needing correction. A filled form is not approval." },
    fields: [
      choice("reviewStatus", "Review result", ["In progress", "Reviewed with open questions", "Reviewed"], { completion: true }),
      text("reviewNotes", "Findings, decisions, and remaining questions", { completion: false, placeholder: "Only material changes, decisions, or unresolved questions. Cite exact IDs; otherwise leave blank.", aiHint: "Optional. Use brief actionable findings only; do not repeat the review status or write a no-findings statement." })
    ]
  };
}

export function recordSection(id: string, title: string, target: string, subsection: number, dataKey: string, prefix: string, primaryField: string, fields: Field[], extra: Partial<Repeater> = {}): Section & { repeatable: Repeater } {
  return {
    id, key: id, title, documentTarget: target, documentSubsection: subsection,
    dataPath: recordsPath,
    description: "Keep stable IDs and refine the shared records as understanding improves.",
    help: { what: title, why: "Shared records keep descriptions, diagrams, and requirements connected.", expectation: "Use established source IDs, preserve unresolved questions, and record only supported behavior." },
    repeatable: {
      dataKey, itemLabel: title, addLabel: "Add record", minimum: 0, stableIds: true,
      displayId: { prefix, padding: 3 }, primaryField, previewStyle: "list",
      completionFields: fields.filter((field) => field.editable !== false).map(({ key }) => key),
      fields, ...extra
    }
  };
}

export function caseView(id: string, title: string, subsection: number, fields: Field[]): Section {
  const identity = useCaseFields.filter(({ key }) => ["name", "primaryActorId", "goalReferences", "briefDescription", "trigger"].includes(key))
    .map((field) => ({ ...field, editable: false, completion: false }));
  return recordSection(id, title, "functional-behavior.use-case-descriptions", subsection, "useCases", "SRS-UC-", "name", [...identity, ...fields], {
    allowAdd: false, allowRemove: false, recordFilter: activeCases, completionMinimum: 1,
    emptyText: "No active use cases yet. Refine the candidates in the Use-Case Catalog first."
  });
}

export function stage(id: string, stateKey: string, label: string, description: string, targets: string[], sources: EvidenceSource[], sections: Section[], guidance: string, steps: GuideStep[]): SchemaNode {
  return {
    id, stateKey, label, description, documentTargets: targets,
    formComponent: "behavior-stage-form", previewComponent: "placed-stage-preview",
    form: { kicker: "Phase 3 · Describe functional behavior", intro: description },
    evidence: { title: "Evidence and behavior already established", summary: "Open an earlier section to correct its source. These references also supply the AI clipboard context.", sources },
    guide: { title: `Build ${label.toLowerCase()}`, summary: description, steps: [...steps, { title: "Carry every question forward", text: followUpGuidance }] },
    ai: {
      ...promptGuidance[id],
      draftingGuidance: promptGuidance[id]?.draftingGuidance || `${guidance} Preserve shared IDs and format all requested record fields. Read-only fields are carried context. Do not infer approval, invent scope or create duplicate use cases. Diagram metadata does not establish omitted file contents.`,
      interviewGuidance: promptGuidance[id]?.interviewGuidance || 'Cover every current record and consequential missing field using the supplied tab inventory and reliable prior conversation or memory. Clarify contradictions and check for uncovered behavior before the handoff.'
    },
    sections
  };
}
