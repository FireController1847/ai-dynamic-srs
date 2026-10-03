// The interview needs immediate prerequisites, not the complete source history.
// Field prompts still receive the full, schema-filtered evidence contract.
const prerequisites = {
  'srs-baseline-evidence-intake': ['client-requirements', 'system-request'],
  'srs-baseline-specification-frame': ['client-requirements', 'system-request'],
  'srs-baseline-scope': ['client-requirements', 'system-request'],
  'srs-baseline-vocabulary': ['client-requirements', 'srs-baseline-scope'],
  'srs-discovery-perspectives': ['client-requirements', 'feasibility-stakeholder-analysis'],
  'srs-discovery-actors-goals': ['srs-baseline-scope', 'srs-discovery-perspectives'],
  'srs-discovery-processes': ['srs-discovery-actors-goals', 'system-request'],
  'srs-behavior-casual-descriptions': ['srs-discovery-processes'],
  'srs-behavior-use-case-map': ['srs-discovery-processes', 'srs-discovery-actors-goals'],
  'srs-behavior-activity-workflows': ['srs-behavior-casual-descriptions'],
  'srs-behavior-detailed-descriptions': ['srs-behavior-casual-descriptions', 'srs-behavior-activity-workflows'],
  'srs-behavior-functional-requirements': ['srs-behavior-detailed-descriptions'],
  'srs-quality-operating-context': ['client-requirements', 'feasibility-stakeholder-analysis'],
  'srs-quality-attributes': ['srs-quality-operating-context', 'srs-behavior-functional-requirements'],
  'srs-quality-interface-requirements': ['srs-discovery-actors-goals', 'srs-behavior-detailed-descriptions'],
  'srs-quality-assumptions': ['srs-baseline-scope', 'srs-quality-interface-requirements']
};
export function simplifiedEvidence(stage) {
  const evidence = stage.evidence || {};
  const desired = prerequisites[stage.id] || [];
  const interviewSources = (evidence.sources || []).filter(source => desired.includes(source.nodeId || source.pageId));
  return { ...evidence, interviewSources };
}
