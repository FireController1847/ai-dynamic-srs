import { section, text } from '../../planning/schema-helpers.ts';
export const technicalFeasibilitySection = section('technical-feasibility', 'Technical feasibility', 'Can this be built and operated with available or obtainable skills and technology?', [
  text('technicalConclusion', 'Technical assessment', { completion: true, placeholder: 'Give the conclusion and evidence. Mention only material complexity, integration, staffing or delivery limits. Put unresolved risks in the risk list.' })
]);
