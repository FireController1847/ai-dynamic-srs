import { requirementFields } from "../requirement-fields.ts";
import { stage, reviewSection, recordSection } from "./shared.ts";
import { catalogEvidence, casualSource, mapSource, activitySource, detailSource } from "./evidence.ts";
import { evidenceIntakeStage } from "../phase-one/evidence-intake.ts";
import { requirementKindField, requirementFilter, requirementDisplayId } from "../requirement-records.ts";

const issues = evidenceIntakeStage.sections.find(({ id }) => id === "baseline-exceptions");

export const functionalRequirementsStage = stage(
  "srs-behavior-functional-requirements", "atomicRequirements", "Functional Requirements",
  "Derive individual, verifiable requirements from the behavior already described, then check coverage in both directions.",
  ["functional-behavior.requirements"], [...catalogEvidence, casualSource, mapSource, activitySource, detailSource],
  [
    reviewSection("requirements-review", "Functional Requirements Review", "functional-behavior.requirements", "Check that each requirement has supported behavior and each relevant behavior has requirements or an explicit gap."),
    recordSection("functional-requirements", "Functional Requirements", "functional-behavior.requirements", 1, "requirements", requirementDisplayId("Functional").prefix, "statement", [
      requirementKindField("Functional"),
      ...requirementFields([], { functional: true })
    ], { completionMinimum: 1, recordFilter: requirementFilter("Functional"), itemLabel: "Requirement", addLabel: "Add functional requirement" }),
    {
      ...issues, id: "behavior-issues", key: "behaviorIssues", title: "Shared Gaps and Conflicts",
      documentTarget: "supporting-information.appendices", documentSubsection: 1,
      description: "The same issue register used in Phase 1. Record behavioral conflicts here and retain their source and resolution."
    }
  ],
  "Derive atomic requirements from reviewed use-case behavior and documented rules. Use one system obligation per statement, cite the use case and path/step, and state an observable acceptance criterion. Do not convert benefits or implementation ideas into unsupported requirements. Distinguish draft and reviewed facts; retain gaps in the shared SRS-ISS register. Cross-cutting quality requirements belong to Phase 4.",
  [
    { title: "Trace from behavior", text: "Read a supported actor/system interaction or rule, then write the obligation needed to make it work." },
    { title: "Make it verifiable", text: "State the relevant condition and observable response. Add an acceptance criterion and verification method." },
    { title: "Check coverage both ways", text: "Look for use cases without requirements and requirements without supporting behavior. Record semantic gaps that simple ID checks cannot detect." }
  ]
);
