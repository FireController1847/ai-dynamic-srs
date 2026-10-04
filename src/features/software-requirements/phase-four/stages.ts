import { operatingContextStage, assumptionsStage } from "./context.ts";
import { qualityAttributesStage } from "./attributes.ts";
import { interfaceRequirementsStage } from "./interfaces.ts";

export const phaseFourStages = Object.freeze([
  operatingContextStage, qualityAttributesStage, interfaceRequirementsStage, assumptionsStage
]);
