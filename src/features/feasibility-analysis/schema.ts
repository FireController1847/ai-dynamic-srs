import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
import { analysisDetailsSection } from './sections/analysis-details.ts';
import { stakeholderAnalysisSection } from './sections/stakeholders.ts';
import { technicalFeasibilitySection } from './sections/technical.ts';
import { economicFeasibilitySection } from './sections/economic.ts';
import { organizationalFeasibilitySection } from './sections/organizational.ts';
import { feasibilityRisksSection } from './sections/risks.ts';
import { overallRecommendationSection } from './sections/recommendation.ts';
import { guide, ai, source, section, text } from '../planning/schema-helpers.ts';
const task = 'Decide whether the proposed project is technically achievable, economically justified and organizationally supportable. Reuse the stakeholder list, proposal and live CBA. Finish with concise technical and organizational assessments, material risks and a recommendation with necessary conditions. Do not rewrite financial results or require a separate rating and essay for every consideration.';
export const feasibilityAnalysisSchema: SchemaNode = {
  id: 'feasibility-stakeholder-analysis', stateKey: 'feasibilityStakeholderAnalysis', code: 'FSA', label: 'Feasibility & Stakeholder Analysis (FSA)', title: 'Feasibility & Stakeholder Analysis', description: 'Assess whether the proposal is technically achievable, economically justified and organizationally supportable.',
  dateDependencies: ['costBenefitAnalysis'],
  compactPreview: true, omitEmptyFields: true, formComponent: 'feasibility-form', previewComponent: 'feasibility-preview',
  form: { kicker: 'Project evaluation', intro: 'Assess the proposal using what is already known. Record only findings that affect the decision.', showCompletion: true },
  guide: guide('Assess feasibility', [
    { term: 'Technical feasibility', definition: 'Whether the project can realistically be built and operated.' },
    { term: 'Economic feasibility', definition: 'Whether the expected value justifies the costs and uncertainty.' },
    { term: 'Organizational feasibility', definition: 'Whether the organization can adopt and support the change.' }
  ]), ai: ai(task, [
    { term: 'Technical feasibility', definition: 'Whether the project can be built and operated with available or obtainable skills and technology.' },
    { term: 'Economic feasibility', definition: 'Whether expected value justifies the costs and uncertainty.' },
    { term: 'Organizational feasibility', definition: 'Whether the organization can adopt and support the change.' }
  ]),
  evidence: { title: 'Existing project evidence', sources: [
    source('client-requirements', ['business-context', 'stakeholders', 'scope-constraints']),
    source('system-request', ['project-sponsor', 'business-requirements', 'business-value', 'special-issues']),
    source('cost-benefit-analysis', ['model-setup', 'financial-summary'])
  ] },
  document: { titleField: 'projectName', organizationField: 'clientOrganization', versionField: 'version', metadata: [
    { key: 'analysisDate', label: 'Analysis date', format: 'date' }, { key: 'preparedBy', label: 'Prepared by' }, { key: 'overallRecommendation', label: 'Recommendation' }, { key: 'version', label: 'Version' }
  ] },
  sections: [analysisDetailsSection, stakeholderAnalysisSection, technicalFeasibilitySection,
    section('carried-cba-decision', 'Financial case', 'Carried directly from the CBA.', [
      text('economicRecommendation', 'CBA recommendation', { editable: false }), text('financialInterpretation', 'Decision basis and uncertainty', { editable: false }), text('intangibleCosts', 'Nonfinancial drawbacks', { editable: false })
    ], { dataPath: ['costBenefitAnalysis'] }),
    economicFeasibilitySection, organizationalFeasibilitySection, feasibilityRisksSection, overallRecommendationSection]
};
