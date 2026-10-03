// Shared by compact source navigation and AI clipboard context.
function stageSource(phaseId, phaseKey, nodeId, stateKey, reason, sectionIds) {
  return {
    pageId: "software-requirements-specification", nodeId,
    dataPath: ["softwareRequirementsSpecification", phaseKey, stateKey],
    subpageSelections: { "software-requirements-specification": phaseId, [phaseId]: nodeId },
    reason,
    groups: sectionIds.map((sectionId) => ({ sectionId }))
  };
}
const baseline = (nodeId, stateKey, reason, sectionIds) => stageSource(
  "srs-establish-baseline", "baselineConstruction", nodeId, stateKey, reason, sectionIds
);
const discovery = (nodeId, stateKey, reason, sectionIds) => stageSource(
  "srs-discover-actors-goals", "actorGoalDiscovery", nodeId, stateKey, reason, sectionIds
);

export const phaseTwoBaselineSources = [
  baseline("srs-baseline-evidence-intake", "evidenceIntake", "Accepted evidence and unresolved exceptions.", ["baseline-decision", "baseline-exceptions"]),
  baseline("srs-baseline-scope", "scopeBaseline", "The boundary and decisions that discovery must respect.", ["carried-scope", "scope-decisions"]),
  baseline("srs-baseline-vocabulary", "vocabularyBaseline", "Established domain language and unresolved meanings.", ["vocabulary-review", "controlled-terms"])
];
export const stakeholderSources = [
  ...phaseTwoBaselineSources,
  {
    pageId: "feasibility-stakeholder-analysis",
    reason: "Reuse stakeholder identities, interests, concerns, and feasibility conditions.",
    groups: [{ sectionId: "stakeholder-analysis" }, { sectionId: "overall-recommendation" }]
  },
  {
    pageId: "client-requirements",
    reason: "Original user viewpoints, needs, and system boundary.",
    groups: [{ sectionId: "stakeholders" }, { sectionId: "client-needs" }, { sectionId: "scope-constraints" }]
  }
];
export const perspectiveSource = discovery(
  "srs-discovery-perspectives", "stakeholderPerspectives",
  "Distinguish interacting roles from people whose interests still require representation.",
  ["perspective-review", "stakeholder-perspectives"]
);
export const actorGoalSource = discovery(
  "srs-discovery-actors-goals", "actorsAndGoals",
  "Reuse canonical actor and goal IDs when identifying processes.",
  ["actor-boundary", "actor-catalog", "goal-catalog"]
);
export const actorSources = [
  ...phaseTwoBaselineSources, perspectiveSource,
  {
    pageId: "client-requirements",
    reason: "The original problem, needs, and boundary accepted or qualified in Phase 1.",
    groups: [{ sectionId: "business-context" }, { sectionId: "client-needs" }, { sectionId: "scope-constraints" }]
  },
  {
    pageId: "system-request",
    reason: "Check that proposed processes cover supported business capabilities.",
    groups: [{ sectionId: "business-requirements" }, { sectionId: "special-issues" }]
  }
];
export const processSources = [...actorSources, actorGoalSource];
