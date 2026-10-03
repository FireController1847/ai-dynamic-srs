import { useCaseCatalogStage } from "./catalog.js";
import { casualDescriptionsStage, detailedDescriptionsStage } from "./descriptions.js";
import { useCaseMapStage, activityWorkflowsStage } from "./diagrams.js";
import { functionalRequirementsStage } from "./requirements.js";

export const phaseThreeStages = Object.freeze([
  useCaseCatalogStage, casualDescriptionsStage, useCaseMapStage,
  activityWorkflowsStage, detailedDescriptionsStage, functionalRequirementsStage
]);
