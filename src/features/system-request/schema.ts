import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
import { needPriorities } from '../../core/schema/shared-options.ts';
import { text, short, choice, optional, section, records, metadata, source, guide, ai } from '../planning/schema-helpers.ts';
const task = 'Establish the project sponsor, proposed capabilities, expected benefits and material issues for a concise request based on Client Requirements.';
export const systemRequestSchema: SchemaNode = {
  id: 'system-request', stateKey: 'systemRequest', code: 'SR', label: 'System Request (SR)', title: 'System Request', description: 'Turn the established client needs into a short proposal and business case.',
  compactPreview: true, omitEmptyFields: true, formComponent: 'evidence-form',
  form: { kicker: 'Project initiation', intro: 'Build a short business case from the client’s existing answers.', showCompletion: true },
  guide: guide('Propose the project', [{ term: 'Sponsor', definition: 'The business person accountable for supporting the request.' }, { term: 'Business value', definition: 'The improvement expected from delivering a capability.' }]), ai: ai(task, [{ term: 'Sponsor', definition: 'The business person accountable for supporting the request.' }, { term: 'Business value', definition: 'The improvement expected from delivering a capability.' }], {
    interviewGuidance: 'Reuse settled Client Requirements from available conversation or memory. Cover every current capability, benefit and special issue, clarify missing sponsor or outcome details, and check for uncovered client needs. Leave quantified costs to CBA and feasibility judgments to FSA.',
    draftingGuidance: 'Format the requested sponsor, capability, benefit and special-issue records as complete form values. Group or summarize client needs into high-level capabilities with exact need links; keep benefits under their linked capability or the project-wide group. Do not rewrite the carried business problem or invent quantified benefits.'
  }),
  evidence: { title: 'Client discovery', sources: [source('client-requirements', ['business-context', 'client-needs', 'stakeholders', 'scope-constraints', 'discovery-record'])] },
  document: { titleField: 'projectName', organizationField: 'clientOrganization', versionField: 'version', metadata: [
    { key: 'requestDate', label: 'Request date', format: 'date' }, { key: 'preparedBy', label: 'Prepared by' }, { key: 'sponsorName', label: 'Sponsor' }, { key: 'version', label: 'Version' }
  ] },
  sections: [
    section('request-details', 'Document details', 'Project identity comes from Client Requirements.', metadata('requestDate', 'systemRequest'), { includeInPreview: false }),
    section('project-sponsor', 'Project sponsor', 'Identify the business owner of the request.', [short('sponsorName', 'Sponsor'), short('sponsorTitle', 'Role'), optional(short('sponsorContact', 'Contact information'))]),
    section('business-need', 'Business need', 'Carried from Client Requirements; correct the original answer there if needed.', [
      text('businessProblem', 'Problem and current situation', { editable: false }), text('desiredOutcome', 'Desired outcome', { editable: false })
    ], { dataPath: ['clientRequirements'] }),
    records('business-requirements', 'Business requirements', 'List the proposed high-level capabilities. Do not repeat each need’s background.', 'requirements', 'SR-BR-', 'statement', [
      text('statement', 'Capability', { completion: true }), optional(choice('priority', 'Priority', needPriorities)),
      { ...short('source', 'Client needs served'), type: 'record-links', reference: { dataPath: ['clientRequirements', 'needs'], displayId: { prefix: 'CR-', padding: 3 }, labelField: 'statement' }, aiHint: 'Select the existing need IDs; no rationale paragraph is needed.' }
    ], { itemLabel: 'Capability', addLabel: 'Add capability' }),
    records('business-value', 'Business value', 'State the benefit; quantify it later in the CBA.', 'values', 'SR-BV-', 'valueStatement', [
      text('valueStatement', 'Expected benefit and who gains', { completion: true }), short('relatedRequirement', 'Related capability', { completion: false }),
      optional(text('measureAndTarget', 'Known target or supporting evidence', { aiHint: 'Include a measure, timeframe and source only when established. Do not invent a target.' }))
    ], { itemLabel: 'Benefit', addLabel: 'Add benefit', parent: {
      fieldKey: 'relatedRequirement', label: 'Capability', reference: { dataPath: ['systemRequest', 'requirements'], displayId: { prefix: 'SR-BR-', padding: 3 }, labelField: 'statement' },
      allowUngrouped: true, preserveFreeform: true, unassignedOption: 'Project-wide or shared', ungroupedTitle: 'Project-wide or shared benefits', ungroupedAddLabel: 'Add shared benefit',
      description: 'Add benefits beneath their capability; the link is automatic.'
    } }),
    records('special-issues', 'Special issues', 'Add only new issues affecting this proposal. Existing client constraints remain in the source.', 'issues', 'SR-SI-', 'issueStatement', [
      text('issueStatement', 'Issue and its consequence', { completion: true }),
      choice('status', 'Disposition', ['Open', 'Needs clarification', 'Requires feasibility analysis', 'Accepted constraint', 'Excluded', 'Deferred', 'Resolved'], { default: 'Open' }),
      optional(text('responseAndSource', 'Response or next action and source'))
    ], { itemLabel: 'Issue', addLabel: 'Add issue' })
  ]
};
