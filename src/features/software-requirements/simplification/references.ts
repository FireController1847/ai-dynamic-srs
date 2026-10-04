import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
const root = ['softwareRequirementsSpecification', 'records'];
const eligibility: Record<string, import("../../../core/schema/schema-types.ts").Condition> = {
  actors: { key: 'status', notIn: ['Not an actor'] },
  goals: { key: 'scopeStatus', notIn: ['Excluded', 'Deferred'] },
  useCases: { key: 'disposition', notIn: ['Excluded', 'Deferred'] }
};
const ref = (collection: string, prefix: string, labelField: string, padding: number = 3): Reference => ({ dataPath: [...root, collection], displayId: { prefix, padding }, labelField, recordFilter: eligibility[collection] });
const links: Record<string, Reference> = {
  supportingActorReferences: ref('actors', 'SRS-ACT-', 'name'),
  goalReferences: ref('goals', 'SRS-GOL-', 'outcome'),
  useCaseReferences: ref('useCases', 'SRS-UC-', 'name'),
  figureReferences: ref('artifacts', 'FIG-', 'title', 4)
};
export function simplifyReference(field: Field): Field {
  if (!links[field.key]) return field;
  return { ...field, type: 'record-links', reference: links[field.key], referenceFormat: 'ids',
    label: field.label.replace(/\s*\(IDs\)| IDs/g, ''), completion: false,
    aiHint: `${field.aiHint || ''} Choose existing records by name in the form; return their exact IDs when filling from AI. Reuse established links.`.trim() };
}
