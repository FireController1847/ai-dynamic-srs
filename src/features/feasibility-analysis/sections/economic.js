import { section, optional, text } from '../../planning/schema-helpers.js';
export const economicFeasibilitySection = section('economic-feasibility', 'Economic feasibility', 'The live CBA supplies financial results and its recommendation; do not copy the totals into this form.', [
  optional(text('economicConclusion', 'Additional funding or affordability considerations', { placeholder: 'Only factors not already addressed in the CBA, such as available budget or a funding condition.' }))
]);
