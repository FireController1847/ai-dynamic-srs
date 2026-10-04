import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
// Finish lines for guidance interviews; field contracts belong to schemas.
export const promptTasks: Record<string, string> = {
  'srs-baseline-evidence-intake': 'Use the connected project sources. Record only actual gaps or conflicts. Finish when the sources needed to begin are available; no baseline essay is required.',
  'srs-baseline-specification-frame': 'Write a brief purpose, identify the readers, and explain how the product fits its environment. Reuse prior project facts.',
  'srs-baseline-scope': 'Reuse the established inclusions, exclusions and capabilities. Record only changes or unresolved scope decisions; do not rewrite the business case.',
  'srs-baseline-vocabulary': 'List the terms readers need and concise definitions. Clarify conflicting meanings only when they affect the specification.',
  'srs-discovery-perspectives': 'List user groups and characteristics that affect use, such as experience or accessibility needs. Reuse stakeholder names; goals come next.',
  'srs-discovery-actors-goals': 'List external interacting roles and their goals. An actor is a role or external system that interacts with the product; a goal is a useful outcome it seeks. Finish with actor names and goal bullets, not flows or justifications.',
  'srs-discovery-processes': 'Create one use-case list from the actor goals. Each case needs a name, primary actor and short purpose. Add meaningful include/extend relationships only if needed; these are not sequence arrows.',
  'srs-behavior-casual-descriptions': 'Refine each existing use-case summary into a short description only where needed. An adequate existing description is already finished. Detailed steps come later.',
  'srs-behavior-use-case-map': 'Help construct the use-case diagram from the existing catalog. Record its title, caption and cases shown. Metadata alone does not establish what an unseen diagram contains.',
  'srs-behavior-activity-workflows': 'Model selected scenarios where a diagram helps clarify behavior. Record a title, caption and cases shown. Correct discoveries in their source descriptions instead of writing a second account of the diagram.',
  'srs-behavior-detailed-descriptions': 'Develop selected cases into numbered normal steps and relevant alternatives or subflows. Keep conditions and rules needed to understand behavior. Simple cases can remain overviews without a justification essay.',
  'srs-behavior-functional-requirements': 'Capture missing, observable system obligations from the established behavior. One clear statement per requirement. Add acceptance detail only if success is not already clear in the statement.',
  'srs-quality-operating-context': 'Describe missing operating conditions and binding limits. Carry earlier constraints forward. Do not re-enter the project scope.',
  'srs-quality-attributes': 'Record applicable quality expectations with measurable targets and conditions in the statement. Keep unagreed targets proposed. Do not fill categories with invented requirements.',
  'srs-quality-interface-requirements': 'Describe actual external exchanges and necessary compatibility or failure behavior. Link existing obligations instead of rewriting them. Categories may be not applicable.',
  'srs-quality-assumptions': 'List conditions the project depends on, and material consequences if they fail. Reuse existing assumptions. Resolve real uncertainties in the shared question list.'
};
