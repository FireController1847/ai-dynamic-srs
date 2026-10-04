import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
// Domain outcomes for tab interviews. Conversation and formatting behavior are defined separately.
export const promptTasks: Record<string, string> = {
  'srs-baseline-evidence-intake': 'Understand the project facts needed to begin SRS construction and the actual gaps or conflicts recorded in the shared question register.',
  'srs-baseline-specification-frame': 'Establish a brief specification purpose, its intended readers and the product context needed to interpret it.',
  'srs-baseline-scope': 'Establish the project boundary and material scope decisions, reusing the existing inclusions, exclusions and capabilities.',
  'srs-baseline-vocabulary': 'Establish every project term readers need and its intended meaning.',
  'srs-discovery-perspectives': 'Establish every relevant user class and the characteristics that affect use of the system.',
  'srs-discovery-actors-goals': 'Establish every external interacting role and all its useful goals within the subject boundary.',
  'srs-discovery-processes': 'Establish the complete canonical use-case catalog from actor goals, including the required information for every case and any meaningful directed relationships.',
  'srs-behavior-casual-descriptions': 'Establish an adequate short actor/system success description for every eligible existing use case.',
  'srs-behavior-use-case-map': 'Establish the intended coverage, title, caption and case links of each useful use-case diagram.',
  'srs-behavior-activity-workflows': 'Establish each useful scenario diagram and its metadata, reflecting any discovered behavior gaps in the canonical use-case descriptions.',
  'srs-behavior-detailed-descriptions': 'Establish the trigger and appropriate detail level of every eligible case, with complete normal steps and relevant conditions, alternatives and subflows for detailed cases.',
  'srs-behavior-functional-requirements': 'Establish the complete supported set of observable system obligations, clarifying every current requirement and material gap in the behavior.',
  'srs-quality-operating-context': 'Establish the operating environment and every genuinely binding limit, reusing earlier scope and constraints.',
  'srs-quality-attributes': 'Establish applicability for every quality category and supported conditions and measurable targets for every relevant quality obligation.',
  'srs-quality-interface-requirements': 'Establish applicability for every interface category and the contracts and necessary failure behavior of all actual external exchanges.',
  'srs-quality-assumptions': 'Establish every material assumption and dependency, including its validation state and relevant consequence of failure.'
};
