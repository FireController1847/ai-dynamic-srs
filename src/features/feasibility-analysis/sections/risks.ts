import { records, text, short, choice, optional } from '../../planning/schema-helpers.ts';
export const feasibilityRisksSection = records('feasibility-risks', 'Material risks', 'Record risks that could change the recommendation, rather than every hypothetical concern.', 'risks', 'FSA-RISK-', 'riskStatement', [
  text('riskStatement', 'Risk, consequence and supporting evidence', { completion: true }),
  text('mitigationOrCondition', 'Response or condition to proceed'), optional(short('riskOwner', 'Responsible person or group')),
  choice('riskStatus', 'Status', ['Open', 'Mitigating', 'Accepted', 'Resolved'], { default: 'Open' })
], { itemLabel: 'Risk', addLabel: 'Add risk' });
