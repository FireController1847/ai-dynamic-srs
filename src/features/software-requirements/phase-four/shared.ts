import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { requirementFields } from "../requirement-fields.ts";
import { followUpGuidance } from "../issue-follow-up.ts";
import { promptGuidance } from '../workflow/prompt-guidance.ts';
import { text, choice, recordSection } from "../phase-three/shared.ts";
import { requirementKindField, requirementFilter, requirementDisplayId } from "../requirement-records.ts";

export { text, choice, recordSection };
export const recordsPath = ["softwareRequirementsSpecification", "records"];
export const actorReference = { dataPath: [...recordsPath, "actors"], displayId: { prefix: "SRS-ACT-", padding: 3 }, labelField: "name" };
export const internal = (key: string, value: unknown): Field => ({ key, label: key, type: "text", default: value, hidden: true, editable: false, includeInPrompt: false, includeInPreview: false });

export function review(id: string, title: string, target: string, question: string, outcomes: string[] = ["In progress", "Requirements identified", "No additional requirements", "Needs clarification"]): Section {
  return {
    id, key: id, title, documentTarget: target, description: question,
    fields: [
      choice(`${id}Status`, "Review outcome", outcomes, { completion: true }),
      text(`${id}Findings`, "Evidence, decisions, and remaining gaps", { completion: false, placeholder: "Only material findings or a brief reason for a boundary exclusion. Otherwise leave blank.", aiHint: "Optional. The selected outcome already records the review result. Add only a specific decision, correction, or question with exact source IDs; no no-additions summary." })
    ]
  };
}

export function requirementSection(id: string, title: string, target: string, kind: string, fields: Field[], extra: Partial<Repeater> = {}): Section {
  const section = recordSection(id, title, target, 1, "requirements", requirementDisplayId(kind).prefix, "statement", [
    requirementKindField(kind), internal("specificationGroup", id),
    ...requirementFields(fields)
  ], {
    itemLabel: `${kind.toLowerCase()} requirement`, addLabel: `Add ${title.toLowerCase()} requirement`,
    recordFilter: requirementFilter(kind, id), ...extra
  });
  return { ...section, help: {
    what: "A supported obligation in the shared requirement register, not another copy of a functional requirement.",
    why: "Quality and external contracts qualify the same system behavior and need the same source and verification trail.",
    expectation: "State one obligation, cite its evidence and affected behavior, and define acceptance. Proposed targets stay proposed until agreed."
  } };
}

export function stage(id: string, stateKey: string, label: string, description: string, targets: string[], sources: EvidenceSource[], sections: Section[], guidance: string, steps: GuideStep[]): SchemaNode {
  return {
    id, stateKey, label, description, documentTargets: targets,
    formComponent: "quality-stage-form", previewComponent: "placed-stage-preview",
    form: { kicker: "Phase 4 · Specify quality and interfaces", intro: description },
    evidence: { title: "Evidence already in this workspace", summary: "Review these short references and open the source when a correction is needed. Clipboard prompts include the connected evidence, not diagram payloads.", sources },
    guide: { title: `Build ${label.toLowerCase()}`, summary: description, steps: [...steps, { title: "Carry every question forward", text: followUpGuidance }] },
    ai: {
      ...promptGuidance[id],
      draftingGuidance: promptGuidance[id]?.draftingGuidance || `${guidance} Format every requested record using canonical IDs and established facts. Distinguish evidenced constraints, proposed targets and unverified assumptions. Never invent thresholds, legal applicability, technology choices or approval. Diagram metadata does not prove omitted file contents.`,
      interviewGuidance: promptGuidance[id]?.interviewGuidance || 'Cover every applicable category and current obligation using the supplied tab inventory and reliable prior conversation or memory. Clarify missing conditions, targets or boundary decisions before the handoff; non-applicability is a supported choice.'
    },
    sections
  };
}
