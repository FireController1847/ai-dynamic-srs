import { FeasibilityForm, FeasibilityPreview } from "./feasibility-analysis/FeasibilityViews.js";
import { SimplifiedStageForm } from "./software-requirements/simplification/SimplifiedStageForm.js";
import { clientRequirementsSchema } from "./client-requirements/schema.js";
import { EvidenceForm } from "../components/forms/EvidenceForm.js";
import { PlacedStagePreview } from "../components/preview/PlacedStagePreview.js";
import { CbaPreview } from "./cost-benefit-analysis/CbaPreview.js";
import { CbaModelSummary } from "./cost-benefit-analysis/CbaSummary.js";
import { costBenefitAnalysisSchema } from "./cost-benefit-analysis/schema.js";
import { EffortBreakdownPreview } from "./effort-breakdown/EffortBreakdownPreview.js";
import { effortBreakdownSchema } from "./effort-breakdown/schema.js";
import { feasibilityAnalysisSchema } from "./feasibility-analysis/schema.js";
import { NotesForm, NotesPreview } from "./notes/NotesComponents.js";
import { notesSchema } from "./notes/schema.js";
import { BaselineStageForm } from "./software-requirements/phase-one/BaselineStageForm.js";
import { BaselineStagePreview } from "./software-requirements/phase-one/BaselineStagePreview.js";
import { ActorsGoalsForm } from "./software-requirements/phase-two/ActorsGoalsForm.js";
import { DiscoveryStageForm } from "./software-requirements/phase-two/DiscoveryStageForm.js";
import { BehaviorStageForm } from "./software-requirements/phase-three/BehaviorStageForm.js";
import { QualityStageForm } from "./software-requirements/phase-four/QualityStageForm.js";
import { softwareRequirementsSchema } from "./software-requirements/schema.js";
import { systemRequestSchema } from "./system-request/schema.js";

export const pages = Object.freeze([
  clientRequirementsSchema,
  systemRequestSchema,
  costBenefitAnalysisSchema,
  feasibilityAnalysisSchema,
  softwareRequirementsSchema,
  effortBreakdownSchema,
  notesSchema
]);

export const featureComponents = Object.freeze({
  FeasibilityForm, FeasibilityPreview,
  SimplifiedStageForm,
  EvidenceForm,
  DiscoveryStageForm,
  ActorsGoalsForm,
  BehaviorStageForm,
  QualityStageForm,
  PlacedStagePreview,
  BaselineStageForm,
  BaselineStagePreview,
  CbaModelSummary,
  CbaPreview,
  EffortBreakdownPreview,
  NotesForm,
  NotesPreview
});

export const defaultPageId = "client-requirements";
export const projectContextStateKey = "clientRequirements";
