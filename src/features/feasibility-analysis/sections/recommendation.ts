import { section, text, choice, optional } from '../../planning/schema-helpers.ts';
export const overallRecommendationSection = section('overall-recommendation', 'Recommendation', 'Make the decision clear without repeating the three assessments.', [
  choice('overallRecommendation', 'Analyst recommendation', ['Proceed', 'Proceed with conditions', 'Reassess after further analysis', 'Do not proceed', 'Not yet determined'], { completion: true }),
  text('recommendationRationale', 'Decisive reason', { completion: true, placeholder: 'One or two sentences explaining what determines the recommendation.' }),
  optional(text('conditionsToProceed', 'Conditions and next actions', { placeholder: 'Include owners or deadlines when necessary. Refer to existing risk entries instead of copying their response.' })),
  optional(text('decisionOutcome', 'Authorized decision, decision maker and date', { aiHint: 'Only a confirmed decision belongs here. An analyst recommendation is not approval.' }))
]);
