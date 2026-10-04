import { section, text } from '../../planning/schema-helpers.ts';
export const organizationalFeasibilitySection = section('organizational-feasibility', 'Organizational feasibility', 'Can the organization adopt and sustain the change?', [
  text('organizationalConclusion', 'Organizational assessment', { completion: true, placeholder: 'Give the conclusion and evidence. Include material sponsor support, user concerns, training or process changes; no separate essay per topic.' })
]);
