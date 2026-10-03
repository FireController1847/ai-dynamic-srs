import { operatingContextStage, assumptionsStage } from "./context.js";
import { qualityAttributesStage } from "./attributes.js";
import { interfaceRequirementsStage } from "./interfaces.js";

export const phaseFourStages = Object.freeze([
  operatingContextStage, qualityAttributesStage, interfaceRequirementsStage, assumptionsStage
]);
