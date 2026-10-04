import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
// Definitions supplied to AI interviews. On-page help has its own content.
const actor = { term: 'Actor', definition: 'An external role, system or device that interacts with the product.' };
const goal = { term: 'Goal', definition: 'A useful outcome an actor seeks from that interaction.' };
const useCase = { term: 'Use case', definition: 'An interaction through which an actor pursues a goal with the system.' };
const constraint = { term: 'Constraint', definition: 'An imposed limit on the system or project, rather than an unconfirmed design preference.' };
const assumption = { term: 'Assumption', definition: 'A condition treated as true until validated by evidence.' };
const dependency = { term: 'Dependency', definition: 'Something the project relies on another party or system to supply.' };

export const promptDefinitions: Record<string, AiDefinition[]> = {
  'srs-baseline-evidence-intake': [{ term: 'Evidence', definition: 'Supplied project information supporting a fact or decision; conflicts and gaps remain explicit.' }],
  'srs-baseline-specification-frame': [{ term: 'Audience', definition: 'A person or group that uses the specification for review, construction, verification or operation.' }],
  'srs-baseline-scope': [constraint, assumption],
  'srs-baseline-vocabulary': [{ term: 'Controlled vocabulary', definition: 'Project terms given a consistent meaning across the specification.' }],
  'srs-discovery-perspectives': [{ term: 'User class', definition: 'A group with characteristics relevant to use; it is not automatically an interacting actor.' }],
  'srs-discovery-actors-goals': [actor, goal],
  'srs-discovery-processes': [useCase,
    { term: 'Includes', definition: 'Required reused behavior from another case.' },
    { term: 'Extends', definition: 'Conditional additional behavior attached to a base case.' }],
  'srs-behavior-casual-descriptions': [useCase],
  'srs-behavior-use-case-map': [actor, useCase],
  'srs-behavior-activity-workflows': [{ term: 'Activity workflow', definition: 'A diagram of scenario actions, decisions and relevant control or information flows.' }],
  'srs-behavior-detailed-descriptions': [{ term: 'Normal flow', definition: 'Ordered actor and system actions along the main successful path.' },
    { term: 'Alternative flow', definition: 'A conditional branch with an identified origin and return or termination.' }],
  'srs-behavior-functional-requirements': [{ term: 'Functional requirement', definition: 'An observable system obligation supporting established behavior.' }],
  'srs-quality-operating-context': [constraint],
  'srs-quality-attributes': [{ term: 'Quality requirement', definition: 'An expectation of how well behavior works, with supported targets and conditions.' }],
  'srs-quality-interface-requirements': [{ term: 'Interface requirement', definition: 'An obligation for exchange, compatibility or failure behavior at an external boundary.' }],
  'srs-quality-assumptions': [assumption, dependency]
};
