import type { DataModel, DocumentModel } from '../../core/schema/schema-types.ts';
import { calculate } from './calculations.ts';
import { isGuidedInterviewPrompt } from '../../core/ai/interview-prompt.ts';
export function financialEvidence(data: DataModel = {}) {
  const model = calculate(data);
  const money = (value: number) => `${Number(value).toFixed(2)} ${data.currencyCode || 'USD'}`;
  return [
    `Analysis: ${model.periods} years; discount rate ${data.discountRate === '' || data.discountRate == null ? 'unconfirmed (0% used provisionally)' : data.discountRate + '%'}.`,
    `PV benefits: ${money(model.totalPresentValueBenefits)}; PV costs: ${money(model.totalPresentValueCosts)}; NPV: ${money(model.netPresentValue)}.`,
    `ROI: ${model.roiPercent == null ? 'unavailable' : model.roiPercent.toFixed(2) + '%'}; discounted break-even: ${model.breakEven.label}.`,
    ...model.warnings.map(warning => `Uncertainty: ${warning}`)
  ].join('\n');
}
export function withFinancialEvidence(markdown: string, key: string, document: DocumentModel) {
  if (isGuidedInterviewPrompt(markdown)) return markdown;
  if (!['cost-benefit-analysis:', 'feasibility-stakeholder-analysis:'].some(prefix => key?.startsWith(prefix))) return markdown;
  return `${markdown}\n\n## Live CBA results (calculated context, not fields to re-enter)\n\n${financialEvidence(document.costBenefitAnalysis)}\nThese results reflect the entered assumptions, not confirmation that the estimates are reliable. Do not invent missing inputs or recompute totals.\n`;
}
