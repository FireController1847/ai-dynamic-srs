import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
import { needPriorities } from '../../core/schema/shared-options.ts';
import { text, short, choice, optional, section, records, metadata, guide, ai } from '../planning/schema-helpers.ts';
const task = 'Establish the client problem, desired result, affected people, needs and boundaries. Finish with short context and numbered lists. Do not design the solution, invent targets or require an explanation for each obvious need.';
export const clientRequirementsSchema: SchemaNode = {
  id: 'client-requirements', stateKey: 'clientRequirements', code: 'CR', label: 'Client Requirements (CR)', title: 'Client Requirements',
  description: 'Establish the client’s problem, desired result, people, needs and project boundary.', compactPreview: true, omitEmptyFields: true,
  form: { kicker: 'Client discovery', intro: 'Describe the problem and what the client needs. Details will develop in later documents.', showCompletion: true },
  guide: guide('Understand the request', [
    { term: 'Stakeholder', definition: 'A person or group affected by the project or able to influence it.' },
    { term: 'Scope', definition: 'What this project includes and excludes.' }
  ]), ai: ai(task, [{ term: 'Stakeholder', definition: 'A person or group affected by the project or able to influence it.' }, { term: 'Scope', definition: 'The boundary of included and excluded project work.' }]),
  document: { titleField: 'projectName', organizationField: 'clientOrganization', versionField: 'version', metadata: [
    { key: 'primaryContact', label: 'Primary contact' }, { key: 'preparedBy', label: 'Prepared by' },
    { key: 'preparationDate', label: 'Date', format: 'date' }, { key: 'version', label: 'Version' }
  ] },
  sections: [
    section('project-details', 'Project details', 'Enter project identity once; later documents reuse it.', [
      short('projectName', 'Project name', { completion: true }), short('clientOrganization', 'Organization'), short('primaryContact', 'Primary contact'), ...metadata('preparationDate', 'clientRequirements')
    ], { includeInPreview: false }),
    section('business-context', 'Problem and desired outcome', 'Briefly explain today’s problem and what improvement would count as success.', [
      text('businessProblem', 'Problem and current situation', { completion: true, placeholder: 'What happens today, who is affected, and why does it matter?' }),
      text('desiredOutcome', 'Desired outcome and success measures', { completion: true, placeholder: 'What should improve? Include a measurable target only if known.' })
    ]),
    records('stakeholders', 'Stakeholders and users', 'Name each relevant person or group once.', 'stakeholders', 'CR-STK-', 'name', [
      short('name', 'Person or group', { completion: true }), short('role', 'Role'), optional(text('interest', 'Important goals or concerns'))
    ], { addLabel: 'Add stakeholder', itemLabel: 'Stakeholder' }),
    records('client-needs', 'Client needs', 'One requested outcome or capability per entry, in the client’s language.', 'needs', 'CR-', 'statement', [
      text('statement', 'Need', { completion: true }), optional(choice('priority', 'Priority', needPriorities)),
      optional(short('source', 'Source (if different from the discovery source)'))
    ], { addLabel: 'Add need', itemLabel: 'Need' }),
    section('scope-constraints', 'Boundaries and limits', 'Capture the boundary without repeating the full list of needs.', [
      text('inScope', 'Included', { completion: true }), text('outOfScope', 'Excluded or deferred'),
      optional(text('constraints', 'Binding limits')), optional(text('assumptions', 'Assumptions and dependencies'))
    ]),
    section('discovery-record', 'Sources and open questions', 'Record where this information came from and what still needs an answer.', [
      text('discoverySources', 'Interviews or documents used', { placeholder: 'Person/document, date, and a useful locator when available.' }),
      optional(text('openQuestions', 'Open questions and follow-up'))
    ])
  ]
};
