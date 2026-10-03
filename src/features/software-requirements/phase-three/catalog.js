import { primaryActorGrouping } from "../phase-two/record-references.js";
import { stage, reviewSection, recordSection, useCaseFields, useCaseReference, text, choice, link } from "./shared.js";
import { discoverySources } from "./evidence.js";

export const useCaseCatalogStage = stage(
  "srs-behavior-use-case-catalog", "useCaseCatalog", "Use-Case Catalog",
  "Refine the candidate processes into a coherent catalog. Keep the same IDs and resolve overlaps before writing stories.",
  ["functional-behavior.use-case-model"], discoverySources,
  [
    reviewSection("catalog-review", "Use-Case Catalog Review", "functional-behavior.use-case-model", "Compare the candidate set against actors, goals, and the scope baseline."),
    recordSection("use-case-catalog", "Use-Case Catalog", "functional-behavior.use-case-model", 1, "useCases", "SRS-UC-", "name", [
      ...useCaseFields,
      choice("importance", "Importance", ["High", "Medium", "Low"]),
      text("importanceReason", "Why this case needs attention", { placeholder: "Business value, complexity, risk, frequency, or time criticality." }),
      text("stakeholderInterests", "Supporting stakeholder interests and source IDs"),
      choice("detailLevel", "Detail needed", ["Overview sufficient", "Detailed description needed", "Not yet decided"]),
      text("detailReason", "Reason for the chosen detail level")
    ], { minimum: 0, completionMinimum: 1, parent: primaryActorGrouping, itemLabel: "Use case", addLabel: "Add use case" }),
    recordSection("use-case-relationships", "Use-Case Relationships", "functional-behavior.use-case-model", 2, "useCaseRelationships", "SRS-REL-", "rationale", [
      link("fromUseCaseId", "From use case", useCaseReference, { completion: false }),
      choice("relationship", "Relationship", ["Includes", "Extends", "Specializes"]),
      link("toUseCaseId", "To use case", useCaseReference),
      text("condition", "Condition or extension point (when applicable)"),
      text("rationale", "Why this relationship is needed")
    ], { itemLabel: "Relationship", addLabel: "Add relationship", parent: {
      fieldKey: "fromUseCaseId", reference: useCaseReference, label: "Source use case",
      recordFilter: { key: "disposition", in: ["Candidate", "Ready for elaboration", "Needs clarification"] },
      description: "Add outgoing relationships beneath their source use case; choose the target and relationship type. The source link is assigned automatically.",
      emptyText: "Create an active use case in the catalog above first.", ungroupedTitle: "Relationships needing a source use case"
    } })
  ],
  "Use verb–noun process names and the existing actors/goals. Include points from the including case to mandatory reused behavior; extend points from optional behavior to its base; specializes points from child to parent. The form groups use cases by primary actor and outgoing relationships by source use case; those parent links are automatic. Keep target use-case references explicit. Actor associations remain the participant references on each use case. Do not use these relationships to express execution order. Keep deferred/excluded cases visible in the catalog. Explain surviving IDs after a merge or split.",
  [
    { title: "Refine the candidate set", text: "Check purpose, actors, goals, trigger, and result. Resolve duplicates or oversized cases with explicit merge/split decisions." },
    { title: "Choose the level of detail", text: "Use importance and risk to decide which cases need detailed flows; record why an overview is sufficient for others." },
    { title: "Add only meaningful relationships", text: "Includes is mandatory reuse; extends is optional behavior at a condition; specializes is a child/parent relationship. Do not add arrows just to imply a sequence." }
  ]
);
