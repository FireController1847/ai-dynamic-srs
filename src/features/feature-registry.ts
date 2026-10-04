import { FeasibilityForm, FeasibilityPreview } from "./feasibility-analysis/FeasibilityViews.ts";
import { SimplifiedStageForm } from "./software-requirements/simplification/SimplifiedStageForm.ts";
import { clientRequirementsSchema } from "./client-requirements/schema.ts";
import { EvidenceForm } from "../components/forms/EvidenceForm.ts";
import { PlacedStagePreview } from "../components/preview/PlacedStagePreview.ts";
import { CbaPreview } from "./cost-benefit-analysis/CbaPreview.ts";
import { CbaModelSummary } from "./cost-benefit-analysis/CbaSummary.ts";
import { costBenefitAnalysisSchema } from "./cost-benefit-analysis/schema.ts";
import { EffortBreakdownPreview } from "./effort-breakdown/EffortBreakdownPreview.ts";
import { effortBreakdownSchema } from "./effort-breakdown/schema.ts";
import { feasibilityAnalysisSchema } from "./feasibility-analysis/schema.ts";
import { NotesForm, NotesPreview } from "./notes/NotesComponents.ts";
import { notesSchema } from "./notes/schema.ts";
import { BaselineStageForm } from "./software-requirements/phase-one/BaselineStageForm.ts";
import { BaselineStagePreview } from "./software-requirements/phase-one/BaselineStagePreview.ts";
import { ActorsGoalsForm } from "./software-requirements/phase-two/ActorsGoalsForm.ts";
import { DiscoveryStageForm } from "./software-requirements/phase-two/DiscoveryStageForm.ts";
import { BehaviorStageForm } from "./software-requirements/phase-three/BehaviorStageForm.ts";
import { QualityStageForm } from "./software-requirements/phase-four/QualityStageForm.ts";
import { softwareRequirementsSchema } from "./software-requirements/schema.ts";
import { systemRequestSchema } from "./system-request/schema.ts";

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
