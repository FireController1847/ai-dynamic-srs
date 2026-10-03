import { catalogEvidence, detailSource, mapSource, activitySource, behaviorSource } from "../phase-three/evidence.js";

export const functionalSource = behaviorSource("srs-behavior-functional-requirements", "atomicRequirements", ["requirements-review", "functional-requirements"], "Existing behavioral obligations: qualify them, don't duplicate them.");
export const baselineSources = [
  ...catalogEvidence, detailSource, mapSource, activitySource, functionalSource,
  { pageId: "feasibility-stakeholder-analysis", reason: "Check operating limits, external dependencies, risks, and recommendation conditions.", groups: [{ sectionId: "technical-feasibility" }, { sectionId: "organizational-feasibility" }, { sectionId: "feasibility-risks" }, { sectionId: "overall-recommendation" }] }
];
export function qualitySource(nodeId, stateKey, sectionIds, reason) {
  return {
    pageId: "software-requirements-specification", nodeId,
    dataPath: ["softwareRequirementsSpecification", "qualityInterfaceSpecification", stateKey],
    subpageSelections: { "software-requirements-specification": "srs-specify-quality-interfaces", "srs-specify-quality-interfaces": nodeId },
    reason, groups: sectionIds.map(sectionId => ({ sectionId }))
  };
}
export const operatingSource = qualitySource("srs-quality-operating-context", "operatingContext", ["operating-environment", "constraints-review", "operating-constraints"], "Use the same operating conditions and mandated limits when setting measurable expectations.");
export const attributesSource = qualitySource("srs-quality-attributes", "qualityAttributes", ["operational", "performance", "security", "cultural-political"].flatMap(id => [`${id}-review`, id]), "Reuse cross-cutting quality obligations and their acceptance criteria at external boundaries, including category review decisions.");
export const interfacesSource = qualitySource("srs-quality-interface-requirements", "interfaceRequirements", ["user", "hardware", "software", "communication"].flatMap(id => [`${id}-interface-review`, id]), "Identify external services, equipment, data, and human interaction on which the specification depends, including justified non-applicability.");
