import type { DataModel, DocumentModel, SchemaNode, Field, Section, Repeater, RecordReview, ReviewRecord, ReviewCatalog } from '../../../core/schema/schema-types.ts';
import type { SrsRecords } from '../record-types.ts';
import { srsRecords } from '../record-types.ts';
import { asDataModel } from "../../../core/schema/data-models.ts";
import { sectionRecords } from "../../../core/schema/section-records.ts";
import { present } from "../record-review.ts";
import { phaseFourStages } from "./stages.ts";

// Check declared outcomes against the same filtered records used by the forms.
export function categoryReviewMessages(rank: number, documentModel: DocumentModel) {
  const srs = documentModel.softwareRequirementsSpecification || {};
  const records = srsRecords(documentModel);
  const phase = asDataModel(srs.qualityInterfaceSpecification);
  const messages = [];
  for (const stage of phaseFourStages.slice(0, rank + 1)) {
    const local = asDataModel(phase[stage.stateKey]);
    for (const section of (stage.sections || []).filter(section => section.repeatable?.dataKey === "requirements")) {
      const reviewId = section.repeatable!.recordFilter!.all![0].equals === "Quality" ? `${section.id}-review` : `${section.id}-interface-review`;
      const outcome = local[`${reviewId}Status`];
      const items = sectionRecords(section.repeatable!, records).filter(item => !["Deferred", "Rejected"].includes(String(item.status)) && present(item.statement));
      if (outcome === "Requirements identified" && !items.length) messages.push(`${section.title}: the review says requirements were identified, but no active statement is recorded in this category.`);
      if (outcome === "Needs clarification") messages.push(`${section.title}: clarification is outstanding; assign its question to the shared issue register before handing off.`);
    }
  }
  if (rank >= 0) {
    const local = asDataModel(phase.operatingContext);
    const constraints = (records.scopeDecisions || []).filter(item => item && !item._retired && !item.retired && item.decisionType === "Constraint" && item.status !== "Superseded" && present(item.statement));
    if (local["constraints-reviewStatus"] === "No binding constraints identified" && constraints.some(item => item.status === "Confirmed")) messages.push("Constraint Review: confirmed constraints conflict with 'No binding constraints identified'; reconcile the decision.");
  }
  if (rank >= 3) {
    const local = asDataModel(phase.assumptionsAndDependencies);
    const assumptions = (records.scopeDecisions || []).filter(item => item && !item._retired && !item.retired && item.decisionType === "Assumption" && item.status !== "Superseded" && present(item.statement));
    if (local["assumptions-reviewStatus"] === "No outstanding conditions" && assumptions.some(item => item.validationStatus !== "Validated" || !present(item.validationEvidence))) messages.push("Assumption Review: 'No outstanding conditions' conflicts with assumptions lacking validation and evidence.");
  }
  return messages;
}
