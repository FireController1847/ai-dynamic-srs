import { sectionRecords } from "../../../core/schema/section-records.js";
import { formatRecordDisplayId, hasNonDefaultValue } from "../../../core/records/record-values.js";
import { phaseFourStages } from "./stages.js";
import { present, availableSrsIds, missingReferenceMessages } from "../record-review.js";
import { behaviorReview } from "../phase-three/behavior-review.js";
import { categoryReviewMessages } from "./review-outcomes.js";

export function qualityReview(stageId, documentModel) {
  const rank = phaseFourStages.findIndex(({ id }) => id === stageId);
  const records = documentModel.softwareRequirementsSpecification?.records || {};
  const behavior = behaviorReview("srs-behavior-functional-requirements", documentModel, 4);
  const messages = [...behavior.messages, ...categoryReviewMessages(rank, documentModel)];
  const catalogs = phaseFourStages.slice(0, rank + 1).flatMap(stage => stage.sections
    .filter(section => section.repeatable && section.repeatable.dataKey !== "evidenceIssues")
    .map(section => {
      const rep = section.repeatable;
      return {
        title: section.title,
        items: sectionRecords(rep, records)
          .filter(record => rep.fields.some(field => !field.hidden && hasNonDefaultValue(record[field.key], field.default)))
          .map(record => ({ ...record, referenceId: formatRecordDisplayId(rep.displayId, record), label: record[rep.primaryField] || "Unnamed record" })),
        target: {
          pageId: "software-requirements-specification",
          subpageSelections: { "software-requirements-specification": "srs-specify-quality-interfaces", "srs-specify-quality-interfaces": stage.id },
          anchorId: `${stage.id}-${section.id}`
        }
      };
    }));

  const available = availableSrsIds(records);
  for (const item of catalogs.flatMap(({ items }) => items)) {
    if (["Deferred", "Rejected", "Superseded"].includes(item.status)) continue;
    messages.push(...missingReferenceMessages(item, ["useCaseReferences", "externalActorId", "sourceReferences", "affectedReferences", "relatedRequirementReferences"], available));
    if (["Quality", "Interface"].includes(item.requirementKind)) {
      if (!present(item.statement)) messages.push(`${item.referenceId}: add the actual requirement statement.`);
      if (!present(item.sourceReferences)) messages.push(`${item.referenceId}: cite the evidence supporting this obligation.`);
      if (!present(item.useCaseReferences) && !present(item.rationale)) messages.push(`${item.referenceId}: identify affected use cases or explain system-wide applicability.`);
      if (!present(item.acceptanceCriterion) || !present(item.verificationMethod)) messages.push(`${item.referenceId}: define an observable acceptance criterion and verification method.`);
      if (item.requirementKind === "Quality") {
        if (!present(item.measurementConditions)) messages.push(`${item.referenceId}: state the conditions under which quality is assessed.`);
        if (item.status === "Reviewed" && item.targetAgreement !== "Agreed") messages.push(`${item.referenceId}: the requirement is reviewed but its target is not recorded as agreed.`);
        if (item.targetAgreement === "Agreed" && !present(item.targetAuthority)) messages.push(`${item.referenceId}: identify who or what established the agreed target.`);
      }
      if (item.requirementKind === "Interface" && !present(item.externalActorId) && !present(item.boundaryName)) messages.push(`${item.referenceId}: identify its external actor or qualify the boundary and revisit actor discovery.`);
      if (item.requirementKind === "Interface") {
        if (!present(item.interactionExpectations) && !present(item.interfaceContract)) messages.push(`${item.referenceId}: define the navigation/input/output expectations or external exchange contract.`);
        if (!present(item.failureBehavior)) messages.push(`${item.referenceId}: specify invalid input, unavailable endpoint, and recovery behavior, or justify non-applicability.`);
      }
    }
    if (item.decisionType === "Constraint") {
      if (!present(item.affectedReferences)) messages.push(`${item.referenceId}: identify which use cases or requirements this constraint limits.`);
      if (!present(item.complianceEvidence)) messages.push(`${item.referenceId}: state how compliance with this constraint will be demonstrated.`);
      if (item.status === "Confirmed" && (!present(item.owner) || !present(item.sourceReferences))) messages.push(`${item.referenceId}: cite the authority and supporting evidence for this confirmed constraint.`);
    }
    if (item.decisionType === "Assumption") {
      if (!present(item.affectedReferences)) messages.push(`${item.referenceId}: identify what depends on this condition.`);
      if (!present(item.validationPlan)) messages.push(`${item.referenceId}: record how and when the condition will be checked.`);
      if (item.validationStatus === "Validated" && !present(item.validationEvidence)) messages.push(`${item.referenceId}: validation needs recorded evidence, not just decision confirmation.`);
      if (item.validationStatus !== "Validated") messages.push(`${item.referenceId}: this condition is ${item.validationStatus || "unverified"}; keep it in the handoff until evidence confirms it or a scope decision removes the dependency.`);
      if (!present(item.failureImpact)) messages.push(`${item.referenceId}: record the impact if this condition fails and the next decision in the shared issue register.`);
      if (item.dependencyKind === "External dependency" && !present(item.dependencyProvider)) messages.push(`${item.referenceId}: identify the provider responsible for the external dependency.`);
    }
  }
  return { messages: [...new Set(messages)], catalogs: [...catalogs, ...behavior.catalogs] };
}
