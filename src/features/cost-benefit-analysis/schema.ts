import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
import { section, text, optional, guide, ai, source } from '../planning/schema-helpers.ts';
import { benefitDriversSection } from './sections/benefit-drivers.ts';
import { oneTimeCostsSection } from './sections/one-time-costs.ts';
import { ongoingCostsSection } from './sections/ongoing-costs.ts';
import { evidenceSourcesSection } from './sections/evidence-sources.ts';
const task = 'Model supported benefits and costs over time, then decide whether the financial case supports proceeding. Reuse the System Request benefits. Gather only the quantities, money, timing and sources needed for the selected calculation. Keep nonfinancial benefits in their benefit records. Do not invent a rate or estimate, double count benefits, or ask the user to rewrite calculated totals.';
export const costBenefitAnalysisSchema: SchemaNode = {
  id: 'cost-benefit-analysis', stateKey: 'costBenefitAnalysis', code: 'CBA', label: 'Cost-Benefit Analysis (CBA)', title: 'Cost-Benefit Analysis', description: 'Model supported benefits and costs over time, then assess the financial case.',
  engine: 'cba', summaryComponent: 'cba-model-summary', previewComponent: 'cba-preview', formComponent: 'evidence-form', compactPreview: true, omitEmptyFields: true,
  periodField: 'analysisYears', periods: { minimum: 1, maximum: 10, default: 5 },
  form: { kicker: 'Economic feasibility', intro: 'Enter supported estimates. Costs, benefits and financial results are calculated for you.', showCompletion: true },
  guide: guide('Compare costs and benefits', [
    { term: 'Discount rate', definition: 'The annual rate used to express future money in today’s value; use a sourced rate.' },
    { term: 'Net present value (NPV)', definition: 'Discounted benefits minus discounted costs.' },
    { term: 'Return on investment (ROI)', definition: 'Net present value divided by discounted costs, expressed as a percentage.' },
    { term: 'Discounted break-even', definition: 'When accumulated discounted benefits recover the costs.' }
  ]), ai: ai(task, [
    { term: 'Discount rate', definition: 'The rate used to express future money in present value.' },
    { term: 'Net present value (NPV)', definition: 'Discounted benefits minus discounted costs.' },
    { term: 'Return on investment (ROI)', definition: 'Net present value divided by discounted costs, as a percentage.' }
  ]),
  evidence: { title: 'Proposed benefits and known limits', sources: [source('system-request', ['business-requirements', 'business-value', 'special-issues']), source('client-requirements', ['scope-constraints'])] },
  document: { titleField: 'projectName', organizationField: 'clientOrganization', versionField: 'version', metadata: [
    { key: 'analysisDate', label: 'Analysis date', format: 'date' }, { key: 'preparedBy', label: 'Prepared by' }, { key: 'analysisYears', label: 'Years' }, { key: 'version', label: 'Version' }
  ] },
  sections: [
    section('model-setup', 'Model assumptions', 'Set the analysis period, currency, discount rate and timing convention. Project identity comes from Client Requirements.', [
      { key: "preparedBy", label: "Prepared by", type: "text", default: "", columns: "col-md-6", completion: false, aiHint: "Identify the analyst or team responsible for the model." , optional: true },
      { key: "analysisDate", dateDocument: "costBenefitAnalysis", label: "Analysis date", type: "date", default: "", columns: "col-sm-6 col-md-3", completion: false, aiHint: "Use YYYY-MM-DD and do not infer a date." , optional: true },
      { key: "version", label: "Document version", type: "text", default: "0.1", columns: "col-sm-6 col-md-3", aiHint: "Update the version when model structure or material assumptions change." , optional: true },
      { key: "analysisYears", label: "How many years should this analysis cover?", type: "number", default: 5, min: 1, max: 10, step: 1, columns: "col-md-4", completion: true, aiHint: "Use a one-to-ten-year horizon supported by the project and decision context; three to five years is common." },
      { key: "discountRate", label: "Discount rate (%)", type: "number", default: "", min: 0, max: 100, step: 0.01, columns: "col-md-4", completion: true, aiHint: "Enter a sourced percentage such as 3.5 for 3.5%; identify its organizational or analytical source and do not invent it." },
      { key: "currencyCode", label: "Currency used for every amount", type: "select", default: "USD", columns: "col-md-4", options: ["USD", "CAD", "EUR", "GBP", "AUD", "Other"], aiHint: "Choose the currency used consistently throughout the model." },
      { key: "timingConvention", label: "When should yearly amounts be treated as occurring?", type: "select", default: "End of each year", columns: "col-md-6", options: ["End of each year", "Beginning of each year"], completion: true, aiHint: "Use the convention applied consistently to discounting; the calculator treats Year 0 one-time costs as undiscounted." },
      { key: "modelAssumptions", label: "Rules, assumptions, and items not included", type: "textarea", rows: 3, default: "", columns: "col-md-6", aiHint: "Only state material conventions or exclusions not already clear from the inputs. Cite the discount-rate source here. Leave other details blank when unnecessary." , optional: true }
    ], { includeInPreview: false }),
    benefitDriversSection, oneTimeCostsSection, ongoingCostsSection,
    section('financial-summary', 'Financial decision', 'Use the live results; explain only the decisive factors and uncertainty.', [
      text('financialInterpretation', 'Decision basis and key uncertainty', { placeholder: 'Briefly explain the recommendation and what could change it. Do not repeat the calculated totals.', completion: true }),
      { key: "intangibleCosts", label: "Important drawbacks not expressed in money", type: "textarea", rows: 3, default: "", columns: "col-md-6", aiHint: "Summarize disruption, learning burden, morale, customer friction, operational risk, or other non-monetized adverse effects." , optional: true },
      { key: "economicRecommendation", label: "Does the financial case support proceeding?", type: "select", default: "", columns: "col-md-5", placeholder: "Select a recommendation", options: [{ value: "Economically feasible", label: "Yes — the financial case supports proceeding" }, { value: "Feasible with financial conditions", label: "Yes — if stated financial conditions are met" }, { value: "Requires further analysis", label: "Not yet — more financial evidence is needed" }, { value: "Not economically feasible", label: "No — the financial case does not support proceeding" }], completion: true, aiHint: "Choose the conclusion supported by calculated outputs, uncertainty, and non-financial effects."
        }
    ]),
    evidenceSourcesSection
  ]
};
