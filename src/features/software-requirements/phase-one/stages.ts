import { evidenceIntakeStage } from "./evidence-intake.ts";
import { scopeBaselineStage } from "./scope-baseline.ts";
import { specificationFrameStage } from "./specification-frame.ts";
import { vocabularyBaselineStage } from "./vocabulary-baseline.ts";

export const phaseOneStages = Object.freeze([
  evidenceIntakeStage,
  specificationFrameStage,
  scopeBaselineStage,
  vocabularyBaselineStage
]);
