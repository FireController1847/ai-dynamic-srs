import { evidenceIntakeStage } from "./evidence-intake.js";
import { scopeBaselineStage } from "./scope-baseline.js";
import { specificationFrameStage } from "./specification-frame.js";
import { vocabularyBaselineStage } from "./vocabulary-baseline.js";

export const phaseOneStages = Object.freeze([
  evidenceIntakeStage,
  specificationFrameStage,
  scopeBaselineStage,
  vocabularyBaselineStage
]);
