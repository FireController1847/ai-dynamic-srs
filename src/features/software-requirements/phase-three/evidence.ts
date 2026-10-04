import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { processSources } from "../phase-two/evidence.ts";

export function behaviorSource(id: string, stateKey: string, sectionIds: string[], reason: string): EvidenceSource {
  return {
    pageId: "software-requirements-specification", nodeId: id,
    dataPath: ["softwareRequirementsSpecification", "functionalBehaviorDescription", stateKey],
    subpageSelections: { "software-requirements-specification": "srs-describe-functional-behavior", "srs-describe-functional-behavior": id },
    reason, groups: sectionIds.map((sectionId) => ({ sectionId }))
  };
}
export const catalogSource = {
  pageId: "software-requirements-specification", nodeId: "srs-discovery-processes",
  dataPath: ["softwareRequirementsSpecification", "actorGoalDiscovery", "candidateProcesses"],
  subpageSelections: { "software-requirements-specification": "srs-discover-actors-goals", "srs-discover-actors-goals": "srs-discovery-processes" },
  reason: "The shared use-case catalog and relationships.", groups: [{ sectionId: "use-case-catalog" }, { sectionId: "use-case-relationships" }]
};
export const casualSource = behaviorSource("srs-behavior-casual-descriptions", "casualDescriptions", ["casual-stories"], "The short behavioral contract that diagrams must explain.");
export const mapSource = behaviorSource("srs-behavior-use-case-map", "useCaseMap", ["use-case-figures"], "Map captions, coverage references, and review findings; file bytes are omitted.");
export const activitySource = behaviorSource("srs-behavior-activity-workflows", "activityWorkflows", ["activity-figures"], "Workflow decisions and findings that refine event flows; file bytes are omitted.");
export const detailSource = behaviorSource("srs-behavior-detailed-descriptions", "detailedDescriptions", ["detailed-stories"], "Normal and alternative paths from which atomic requirements are derived.");
export const discoverySources = processSources;
export const catalogEvidence = [...discoverySources, catalogSource];
