import type { SchemaNode } from "../../../core/schema/schema-types.ts";
import { simplifyStage } from "../simplification/stages.ts";
import { useCaseCatalogStage } from "../phase-three/catalog.ts";
import { phaseOneStages } from "../phase-one/stages.ts";
import { stakeholderPerspectivesStage } from "../phase-two/stakeholder-perspectives.ts";
import { actorsGoalsStage } from "../phase-two/actors-goals.ts";
import { candidateProcessesStage } from "../phase-two/candidate-processes.ts";
import { phaseThreeStages } from "../phase-three/stages.ts";
import { phaseFourStages } from "../phase-four/stages.ts";
import { phaseFiveStages } from "../phase-five/stages.ts";
import { phaseSixStages } from "../phase-six/stages.ts";
import { phaseSevenStages } from "../phase-seven/stages.ts";

interface PhaseDefinition {
  id: string;
  stateKey: string;
  label: string;
  title?: string;
  description?: string;
  role?: string;
  dependsOn: string[];
  reviews?: string[];
  stages: readonly SchemaNode[];
}

type CodedPhaseDefinition = PhaseDefinition & { code: string };

function buildStage(phase: CodedPhaseDefinition, originalStage: SchemaNode, index: number, previousId?: string): SchemaNode {
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
      required: stage.workflow?.required ?? true,
      role: stage.role || phase.role,
      sequence: index + 1,
      dependsOn: stage.dependsOn || (previousId ? [previousId] : phase.dependsOn),
      reviews: stage.reviews || phase.reviews || []
    },
    sections: stage.sections || []
  };
}

function buildPhase(definition: PhaseDefinition, index: number): SchemaNode {
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

const phaseDefinitions: PhaseDefinition[] = [
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
    stages: phaseFiveStages
  },
  {
    id: "srs-reconcile-verify",
    stateKey: "specificationReconciliation",
    label: "Reconcile & Verify",
    description: "Compare every view of the system, surface unsupported or uncovered statements, and resolve problems before assembling the document.",
    role: "reconcile",
    dependsOn: ["srs-cross-check-models"],
    reviews: ["srs-establish-baseline", "srs-discover-actors-goals", "srs-describe-functional-behavior", "srs-specify-quality-interfaces", "srs-cross-check-models"],
    stages: phaseSixStages
  },
  {
    id: "srs-assemble-document",
    stateKey: "srsAssembly",
    label: "Assemble the SRS",
    description: "Turn reconciled construction records into one controlled, readable specification without recreating the prior analysis that supports it.",
    role: "assemble",
    dependsOn: ["srs-reconcile-verify"],
    reviews: ["srs-reconcile-verify"],
    stages: phaseSevenStages
  }
];

export const softwareRequirementsPhases = Object.freeze(phaseDefinitions.map(buildPhase));
