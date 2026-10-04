import { useCaseCatalogStage } from "./catalog.ts";
import { casualDescriptionsStage, detailedDescriptionsStage } from "./descriptions.ts";
import { useCaseMapStage, activityWorkflowsStage } from "./diagrams.ts";
import { functionalRequirementsStage } from "./requirements.ts";

export const phaseThreeStages = Object.freeze([
  useCaseCatalogStage, casualDescriptionsStage, useCaseMapStage,
  activityWorkflowsStage, detailedDescriptionsStage, functionalRequirementsStage
]);
