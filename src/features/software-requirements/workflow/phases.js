import { simplifyStage } from "../simplification/stages.js";
import { useCaseCatalogStage } from "../phase-three/catalog.js";
import { phaseOneStages } from "../phase-one/stages.js";
import { stakeholderPerspectivesStage } from "../phase-two/stakeholder-perspectives.js";
import { actorsGoalsStage } from "../phase-two/actors-goals.js";
import { candidateProcessesStage } from "../phase-two/candidate-processes.js";
import { phaseThreeStages } from "../phase-three/stages.js";
import { phaseFourStages } from "../phase-four/stages.js";

function buildStage(phase, originalStage, index, previousId) {
  const stage = simplifyStage(originalStage);
  return {
    ...stage,
    ai: { ...stage.ai, task: stage.ai?.task || stage.description },
    id: stage.id,
    stateKey: stage.stateKey,
    code: `${phase.code}.${index + 1}`,
    label: stage.label,
    title: stage.title || stage.label,
    description: stage.description,
    documentTargets: stage.documentTargets || [],
    workflow: {
      kind: "stage",
      required: true,
      role: stage.role || phase.role,
      sequence: index + 1,
      dependsOn: stage.dependsOn || (previousId ? [previousId] : phase.dependsOn),
      reviews: stage.reviews || phase.reviews || []
    },
    sections: stage.sections || []
  };
}

function buildPhase(definition, index) {
  const phase = { ...definition, code: `SRS-${String(index + 1).padStart(2, "0")}` };
  const stages = definition.stages.map((stage, stageIndex) => (
    buildStage(phase, stage, stageIndex, definition.stages[stageIndex - 1]?.id)
  ));

  return {
    id: definition.id,
    stateKey: definition.stateKey,
    code: phase.code,
    label: definition.label,
    title: definition.title || definition.label,
    description: definition.description,
    defaultSubpageId: stages[0]?.id,
    workflow: {
      kind: "phase",
      role: definition.role,
      sequence: index + 1,
      dependsOn: definition.dependsOn,
      reviews: definition.reviews || []
    },
    subpages: stages,
    sections: []
  };
}

const phaseDefinitions = [
  {
    id: "srs-establish-baseline",
    stateKey: "baselineConstruction",
    label: "Establish Baseline",
    title: "Establish the Baseline",
    description: "Turn prior project work into a trusted starting point. Reuse canonical records and capture only SRS-specific decisions, conflicts, and gaps.",
    role: "establish",
    dependsOn: [],
    stages: phaseOneStages
  },
  {
    id: "srs-discover-actors-goals",
    stateKey: "actorGoalDiscovery",
    label: "Discover Actors & Goals",
    description: "Move from business context to the external roles, goals, and major processes that define why the system must behave as it does.",
    role: "discover",
    dependsOn: ["srs-establish-baseline"],
    reviews: ["srs-establish-baseline"],
    stages: [
      stakeholderPerspectivesStage,
      actorsGoalsStage,
      { ...useCaseCatalogStage, id: candidateProcessesStage.id, stateKey: candidateProcessesStage.stateKey, label: "Use Cases" }
    ]
  },
  {
    id: "srs-describe-functional-behavior",
    stateKey: "functionalBehaviorDescription",
    label: "Describe Behavior",
    title: "Describe Functional Behavior",
    description: "Elaborate candidate behavior one representation at a time, using each new view to expose omissions or contradictions in the one before it.",
    role: "elaborate",
    dependsOn: ["srs-discover-actors-goals"],
    reviews: ["srs-establish-baseline", "srs-discover-actors-goals"],
    stages: phaseThreeStages.filter(stage => stage.id !== "srs-behavior-use-case-catalog")
  },
  {
    id: "srs-specify-quality-interfaces",
    stateKey: "qualityInterfaceSpecification",
    label: "Specify Quality & Interfaces",
    title: "Specify Quality and Interfaces",
    description: "Add the system-wide qualities, interfaces, operating conditions, and dependencies that functional behavior alone cannot express.",
    role: "specify",
    dependsOn: ["srs-describe-functional-behavior"],
    reviews: ["srs-establish-baseline", "srs-describe-functional-behavior"],
    stages: phaseFourStages
  },
  {
    id: "srs-cross-check-models",
    stateKey: "modelCrossChecks",
    label: "Cross-Check with Models",
    description: "Use structural, interaction, state, and interface models as independent views that reveal missing responsibilities, data, transitions, and user paths.",
    role: "validate",
    dependsOn: ["srs-specify-quality-interfaces"],
    reviews: ["srs-describe-functional-behavior", "srs-specify-quality-interfaces"],
    stages: [
      {
        id: "srs-models-domain",
        stateKey: "domainModel",
        label: "Domain & Class Model",
        description: "Develop the behavioral vocabulary into domain concepts, responsibilities, attributes, and relationships, then check it against the use cases.",
        documentTargets: ["analysis-models.domain"]
      },
      {
        id: "srs-models-interactions",
        stateKey: "interactionModels",
        label: "Interaction Models",
        description: "Trace selected scenarios through collaborating actors and objects to expose missing operations, responsibilities, or sequence assumptions.",
        documentTargets: ["analysis-models.interaction"]
      },
      {
        id: "srs-models-state",
        stateKey: "stateModels",
        label: "State Models",
        description: "Model important stateful domain objects and verify that events, guards, transitions, and lifecycle rules are supported by the specification.",
        documentTargets: ["analysis-models.state"]
      },
      {
        id: "srs-models-interface-design",
        stateKey: "interfaceDesignEvidence",
        label: "UI Scenarios & Evidence",
        description: "Use scenarios, storyboards, and mockups to challenge navigation, feedback, validation, accessibility, and other interface requirements.",
        documentTargets: ["analysis-models.interface-design", "external-interfaces.user"]
      }
    ]
  },
  {
    id: "srs-reconcile-verify",
    stateKey: "specificationReconciliation",
    label: "Reconcile & Verify",
    description: "Compare every view of the system, surface unsupported or uncovered statements, and resolve problems before assembling the document.",
    role: "reconcile",
    dependsOn: ["srs-cross-check-models"],
    reviews: ["srs-establish-baseline", "srs-discover-actors-goals", "srs-describe-functional-behavior", "srs-specify-quality-interfaces", "srs-cross-check-models"],
    stages: [
      {
        id: "srs-reconciliation-coverage",
        stateKey: "coverageReview",
        label: "Coverage Review",
        description: "Find goals, needs, use cases, interfaces, and model elements not covered by a requirement—and requirements with no supporting source.",
        documentTargets: ["verification-traceability.coverage"]
      },
      {
        id: "srs-reconciliation-consistency",
        stateKey: "consistencyReview",
        label: "Cross-Model Consistency",
        description: "Compare names, boundaries, responsibilities, flows, states, interfaces, and constraints across every representation of the system.",
        documentTargets: ["verification-traceability.coverage"]
      },
      {
        id: "srs-reconciliation-gaps",
        stateKey: "gapResolution",
        label: "Gaps & Conflicts",
        description: "Track missing, ambiguous, contradictory, or unverified items to explicit resolutions instead of hiding them in document prose.",
        documentTargets: ["verification-traceability.coverage"]
      },
      {
        id: "srs-reconciliation-verification",
        stateKey: "verificationTraceability",
        label: "Verification & Traceability",
        description: "Audit the links accumulated for each requirement: its source, related models, final document placement, and objective verification approach.",
        documentTargets: ["verification-traceability.traceability", "verification-traceability.verification"]
      }
    ]
  },
  {
    id: "srs-assemble-document",
    stateKey: "srsAssembly",
    label: "Assemble the SRS",
    description: "Turn reconciled construction records into one controlled, readable specification without recreating the prior analysis that supports it.",
    role: "assemble",
    dependsOn: ["srs-reconcile-verify"],
    reviews: ["srs-reconcile-verify"],
    stages: [
      {
        id: "srs-assembly-document-control",
        stateKey: "documentControl",
        label: "Document Control",
        description: "Prepare identifying metadata, revision history, and document status for the assembled specification.",
        documentTargets: ["front-matter.document-control", "front-matter.revision-history"]
      },
      {
        id: "srs-assembly-artifacts-references",
        stateKey: "controlledArtifacts",
        label: "Figures & References",
        description: "Confirm that every figure, model, source, and external reference is controlled once and cited consistently from its final destination.",
        documentTargets: ["introduction.references", "supporting-information.artifacts"]
      },
      {
        id: "srs-assembly-appendices",
        stateKey: "appendices",
        label: "Appendices",
        description: "Attach or reference prior analysis and supporting material from canonical workspace records instead of copying them into the SRS.",
        documentTargets: ["supporting-information.appendices"]
      },
      {
        id: "srs-assembly-review",
        stateKey: "assemblyReview",
        label: "Assembly Review",
        description: "Review numbering, cross-references, unresolved issues, approval readiness, and presentation as one complete specification.",
        documentTargets: ["verification-traceability.coverage", "verification-traceability.verification"]
      },
      {
        id: "srs-assembly-complete-document",
        stateKey: "completeDocument",
        label: "Complete SRS",
        description: "Preview and export the complete document assembled from the accepted records and models created throughout the workflow.",
        documentTargets: []
      }
    ]
  }
];

export const softwareRequirementsPhases = Object.freeze(phaseDefinitions.map(buildPhase));
