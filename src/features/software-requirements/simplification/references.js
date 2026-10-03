const root = ['softwareRequirementsSpecification', 'records'];
const eligibility = {
  actors: { key: 'status', notIn: ['Not an actor'] },
  goals: { key: 'scopeStatus', notIn: ['Excluded', 'Deferred'] },
  useCases: { key: 'disposition', notIn: ['Excluded', 'Deferred'] }
};
const ref = (collection, prefix, labelField, padding = 3) => ({ dataPath: [...root, collection], displayId: { prefix, padding }, labelField, recordFilter: eligibility[collection] });
const links = {
  supportingActorReferences: ref('actors', 'SRS-ACT-', 'name'),
  goalReferences: ref('goals', 'SRS-GOL-', 'outcome'),
  useCaseReferences: ref('useCases', 'SRS-UC-', 'name'),
  figureReferences: ref('artifacts', 'FIG-', 'title', 4)
};
export function simplifyReference(field) {
  if (!links[field.key]) return field;
  return { ...field, type: 'record-links', reference: links[field.key], referenceFormat: 'ids',
    label: field.label.replace(/\s*\(IDs\)| IDs/g, ''), completion: false,
    aiHint: 'Choose existing records by name in the form; return their exact IDs when filling from AI. Reuse established links.' };
}
