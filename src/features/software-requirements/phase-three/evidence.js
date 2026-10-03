import { processSources } from "../phase-two/evidence.js";

export function behaviorSource(id, stateKey, sectionIds, reason) {
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
export const casualSource = behaviorSource("srs-behavior-casual-descriptions", "casualDescriptions", ["casual-review", "casual-stories"], "The short behavioral contract that diagrams must explain.");
export const mapSource = behaviorSource("srs-behavior-use-case-map", "useCaseMap", ["map-review", "use-case-figures"], "Map captions, coverage references, and review findings; file bytes are omitted.");
export const activitySource = behaviorSource("srs-behavior-activity-workflows", "activityWorkflows", ["activity-review", "activity-figures"], "Workflow decisions and findings that refine event flows; file bytes are omitted.");
export const detailSource = behaviorSource("srs-behavior-detailed-descriptions", "detailedDescriptions", ["detail-review", "detailed-stories"], "Normal and alternative paths from which atomic requirements are derived.");
export const processHandoffSource = {
  pageId: "software-requirements-specification", nodeId: "srs-discovery-processes",
  dataPath: ["softwareRequirementsSpecification", "actorGoalDiscovery", "candidateProcesses"],
  subpageSelections: { "software-requirements-specification": "srs-discover-actors-goals", "srs-discover-actors-goals": "srs-discovery-processes" },
  reason: "Discovery coverage decisions and unanswered handoff questions. Use-case content is carried once through the shared catalog.", groups: [{ sectionId: "process-review" }]
};
export const discoverySources = [...processSources, processHandoffSource];
export const catalogEvidence = [...discoverySources, catalogSource];
