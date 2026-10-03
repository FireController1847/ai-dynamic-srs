import { softwareRequirementsDocument } from "./document-outline.js";
import { softwareRequirementsPhases } from "./workflow/phases.js";

export const softwareRequirementsSchema = {
  id: "software-requirements-specification",
  stateKey: "softwareRequirementsSpecification",
  code: "SRS",
  label: "Software Requirements Specification (SRS)",
  title: "Software Requirements Specification",
  description: "Build a complete, traceable specification by carrying prior evidence through discovery, elaboration, model-based validation, reconciliation, and assembly.",
  defaultSubpageId: softwareRequirementsPhases[0].id,
  workspace: {
    kicker: "Guided SRS construction",
    title: "Build the specification one decision at a time",
    summary: "Each phase reuses what the project has already established, adds only the next level of detail, and checks the earlier phases for missing or inconsistent information.",
    note: "Workflow order guides the analysis. The finished document outline is maintained separately, so one construction step can contribute to several SRS sections without duplicating data."
  },
  workflow: {
    kind: "workflow",
    principle: "Progressive elaboration with continuous reconciliation"
  },
  stateDefaults: {
    records: {
      evidenceIssues: [],
      audiences: [],
      scopeDecisions: [],
      terms: [],
      perspectives: [],
      actors: [],
      goals: [],
      useCases: [],
      useCaseRelationships: [],
      artifacts: [],
      requirements: []
    }
  },
  document: softwareRequirementsDocument,
  subpages: softwareRequirementsPhases,
  sections: []
};
