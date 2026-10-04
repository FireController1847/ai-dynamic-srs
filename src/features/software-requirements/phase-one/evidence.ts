import type { EvidenceGroup, EvidenceSource } from '../../../core/schema/schema-types.ts';

// Select sections once. Their active schemas own field labels and available answers.
const groups = (...sectionIds: string[]): EvidenceGroup[] => sectionIds.map(sectionId => ({ sectionId }));
const clientContext = { sectionId: 'business-context' };
const clientNeeds = { sectionId: 'client-needs' };
const clientScope = { sectionId: 'scope-constraints' };
const requestNeed = { sectionId: 'business-need' };
const requestCapabilities = { sectionId: 'business-requirements' };
const requestIssues = { sectionId: 'special-issues' };
const feasibilityStakeholders = { sectionId: 'stakeholder-analysis' };
const feasibilityRecommendation = { sectionId: 'overall-recommendation' };
const feasibilityRisks = { sectionId: 'feasibility-risks' };
const notebookEntries: EvidenceGroup = { sectionId: 'notebook-entries', recordFieldKeys: ['body', 'references'] };

const evidenceBaselineSource: EvidenceSource = {
  pageId: 'software-requirements-specification', nodeId: 'srs-baseline-evidence-intake',
  reason: 'Shared source questions, conflicts, and recorded resolutions.',
  groups: groups('baseline-exceptions')
};
const specificationFrameSource: EvidenceSource = {
  pageId: 'software-requirements-specification', nodeId: 'srs-baseline-specification-frame',
  reason: 'The document purpose, product context, and intended audiences.',
  groups: groups('specification-purpose', 'intended-audiences')
};
const scopeBaselineSource: EvidenceSource = {
  pageId: 'software-requirements-specification', nodeId: 'srs-baseline-scope',
  reason: 'The existing boundary and explicit scope changes or qualifications.',
  groups: groups('carried-scope', 'scope-decisions')
};

export const evidenceIntakeSources: EvidenceSource[] = [
  {
    pageId: 'client-requirements',
    reason: 'Original client language, needs, boundary, and unanswered questions.',
    referenceRole: 'Discovery record and original statement of client need',
    groups: groups('project-details', 'business-context', 'stakeholders', 'client-needs', 'scope-constraints', 'discovery-record')
  },
  {
    pageId: 'system-request',
    reason: 'The sponsor, proposed capabilities, expected benefits, and issues affecting the request.',
    referenceRole: 'Business case and high-level capability request',
    groups: groups('request-details', 'project-sponsor', 'business-requirements', 'business-value', 'special-issues')
  },
  {
    pageId: 'cost-benefit-analysis',
    reason: 'Financial assumptions, decision interpretation, and supporting citations.',
    referenceRole: 'Financial source of truth and economic evidence',
    groups: groups('model-setup', 'financial-summary', 'evidence-sources')
  },
  {
    pageId: 'feasibility-stakeholder-analysis',
    reason: 'Technical and organizational assessments, material risks, and recommendation conditions.',
    referenceRole: 'Feasibility decision evidence and conditions for continuation',
    groups: groups('analysis-details', 'technical-feasibility', 'organizational-feasibility', 'feasibility-risks', 'overall-recommendation')
  },
  {
    pageId: 'general-notes',
    reason: 'Working knowledge and its cited sources when they materially inform the specification.',
    referenceRole: 'Supporting notebook; cited only when an entry materially informs the specification',
    groups: [notebookEntries]
  }
];

export const specificationFrameSources: EvidenceSource[] = [
  evidenceBaselineSource,
  { pageId: 'client-requirements', reason: 'The problem, desired outcome, and stakeholder viewpoints.', groups: [clientContext, { sectionId: 'stakeholders' }] },
  { pageId: 'system-request', reason: 'The accountable sponsor and established business need.', groups: [{ sectionId: 'project-sponsor' }, requestNeed] },
  { pageId: 'feasibility-stakeholder-analysis', reason: 'Relevant stakeholders and organizational conditions for the proposed product.', groups: [feasibilityStakeholders, { sectionId: 'organizational-feasibility' }, feasibilityRecommendation] }
];
export const scopeBaselineSources: EvidenceSource[] = [
  evidenceBaselineSource, specificationFrameSource,
  { pageId: 'client-requirements', reason: 'The client boundary, binding limits, assumptions, and individually identified needs.', groups: [clientScope, clientNeeds] },
  { pageId: 'system-request', reason: 'Proposed capabilities and the issues that qualify them.', groups: [requestCapabilities, requestIssues] },
  { pageId: 'feasibility-stakeholder-analysis', reason: 'Feasibility conditions and risks affecting the boundary.', groups: [feasibilityRisks, feasibilityRecommendation] }
];
export const vocabularyBaselineSources: EvidenceSource[] = [
  evidenceBaselineSource, specificationFrameSource, scopeBaselineSource,
  { pageId: 'client-requirements', reason: 'The client’s names for outcomes, capabilities, and project limits.', groups: [clientNeeds, clientScope] },
  { pageId: 'system-request', reason: 'Business-domain wording in capabilities and issues.', groups: [requestCapabilities, requestIssues] },
  { pageId: 'feasibility-stakeholder-analysis', reason: 'Stakeholder-group names and terminology introduced by feasibility analysis.', groups: [feasibilityStakeholders, feasibilityRisks] },
  { pageId: 'general-notes', reason: 'Alternate wording, definitions, and ambiguities recorded during project work.', groups: [notebookEntries] }
];
