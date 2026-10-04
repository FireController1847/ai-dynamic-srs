import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
// Authoring contract for 0.3.0. Stage schemas supply the underlying field descriptors.
// Keys omitted here are not new authoring tasks. Internal identity/classification survives.
export const recordFields: Record<string, string[]> = {
  audiences: ['nameOrGroup'],
  terms: ['term', 'definition', 'usageNotes'],
  perspectives: ['viewpoint', 'characteristics'],
  actors: ['name', 'interaction'],
  goals: ['outcome', 'actorId'],
  useCases: ['name', 'disposition', 'primaryActorId', 'supportingActorReferences', 'goalReferences', 'briefDescription', 'trigger', 'importance', 'stakeholderInterests', 'detailLevel', 'descriptionStyle', 'preconditions', 'successGuarantee', 'failureGuarantee', 'normalFlow', 'subflows', 'alternativeFlows', 'specialConditions', 'figureReferences'],
  useCaseRelationships: ['fromUseCaseId', 'relationship', 'toUseCaseId', 'condition'],
  artifacts: ['artifactGroup', 'title', 'file', 'caption', 'useCaseReferences', 'scenario'],
  requirements: ['requirementKind', 'specificationGroup', 'statement', 'useCaseReferences', 'sourceReferences', 'acceptanceCriterion', 'priority', 'status', 'targetAgreement', 'externalActorId', 'boundaryName', 'relatedRequirementReferences'],
  scopeDecisions: ['decisionType', 'status', 'statement', 'sourceReferences', 'dependencyKind', 'dependencyProvider', 'validationStatus', 'failureImpact'],
  evidenceIssues: ['description', 'affectedReferences', 'resolution', 'status']
};
export const essentialFields: Record<string, string[]> = {
  audiences: ['nameOrGroup'], terms: ['term', 'definition'], perspectives: ['viewpoint', 'characteristics'],
  actors: ['name'], goals: ['outcome'], useCases: ['name', 'briefDescription'],
  useCaseRelationships: ['relationship', 'toUseCaseId'], artifacts: ['title', 'file'],
  requirements: ['statement'], scopeDecisions: ['decisionType', 'statement'], evidenceIssues: ['description']
};
