import type { DataModel, DocumentModel, SchemaNode, Field, Section, Repeater, RecordReview, ReviewRecord, ReviewCatalog } from '../../core/schema/schema-types.ts';
import type { SrsRecords } from './record-types.ts';
import { srsRecords } from './record-types.ts';
import { asDataModel } from "../../core/schema/data-models.ts";
import { live, present, idFor, referenceIds, availableSrsIds, missingReferenceMessages } from "./record-review.ts";
import { requirementReferenceId } from "./requirement-records.ts";

// Read-only advisory handoff. Never infer that prose has been answered or change statuses.
export function followThroughReview(documentModel: DocumentModel, phase: number = 3, behaviorRank: number = 5) {
  const srs = documentModel.softwareRequirementsSpecification || {};
  const records = srsRecords(documentModel);
  const issues = (records.evidenceIssues || []).filter(live).filter(item =>
    ["description", "affectedDecision", "resolution", "nextAction", "sourceReferences", "affectedReferences", "owner", "resolutionEvidence"].some(key => present(item[key]))
  ).map(item => ({ ...item, referenceId: idFor("SRS-ISS-", item), label: item.description || "Issue needing a description" }));
  const messages = [];
  const available = availableSrsIds(records);
  for (const issue of issues) {
    messages.push(...missingReferenceMessages(issue, ["affectedReferences", "sourceReferences"], available));
    if (!present(issue.description)) messages.push(`${issue.referenceId}: describe the unanswered question or conflict.`);
    if (["Resolved", "Accepted exception"].includes(String(issue.status))) {
      if (!present(issue.resolution) || !present(issue.resolutionEvidence) || !present(issue.owner)) {
        messages.push(`${issue.referenceId}: ${String(issue.status).toLowerCase()} needs a confirmed resolution, evidence or authority, and an owner; a status alone does not close the question.`);
      }
      if (issue.status === "Accepted exception") messages.push(`${issue.referenceId}: accepted exception remains visible for reconciliation and assembly; review its limits and authority.`);
    } else {
      const timing = Number(issue.resolveByPhase);
      messages.push(`${issue.referenceId}: unanswered${timing && timing <= phase ? ` and due by Phase ${timing}` : timing ? `; assigned to Phase ${timing}` : "; choose a resolution phase"} — ${issue.description || "describe the gap"}`);
      if (!present(issue.owner) || !present(issue.nextAction)) messages.push(`${issue.referenceId}: assign a resolution owner and next action.`);
      if (!present(issue.affectedReferences) && !present(issue.affectedDecision)) messages.push(`${issue.referenceId}: identify the affected records or decision.`);
    }
  }

  function question(origin: string, value: unknown) {
    if (!present(value)) return;
    const ids = referenceIds(value).filter(id => id.startsWith("SRS-ISS-"));
    if (!ids.length) messages.push(`${origin}: revisit recorded questions; record the answer at its source or cite a shared SRS-ISS issue for follow-through.`);
    for (const id of ids) {
      if (!issues.some(issue => issue.referenceId === id)) messages.push(`${origin}: ${id} is missing or retired; restore the question's follow-through link.`);
    }
    // Linking an issue routes the question; it does not certify that the issue's answer covers the prose.
  }
  const discovery = asDataModel(srs.actorGoalDiscovery);
  for (const [stateKey, statusKey, notesKey, label] of [
    ["stakeholderPerspectives", "perspectiveReadiness", "perspectiveNotes", "Stakeholder Perspectives"],
    ["actorsAndGoals", "actorReviewStatus", "actorReviewNotes", "Actors & Goals"]
  ]) {
    const local = asDataModel(discovery[stateKey]);
    if (["Reviewed with open questions", "Needs stakeholder clarification", "Needs boundary clarification"].includes(String(local[statusKey] || ""))) question(label, local[notesKey] || "Earlier review has unanswered questions");
  }
  const processes = asDataModel(discovery.candidateProcesses);
  if (["Ready with visible questions", "Needs actor, goal, or scope revision"].includes(String(processes.processReadiness))) {
    question("Candidate Processes handoff", processes.handoffNotes || "Unanswered discovery questions");
  }
  if (["Gaps or unsupported processes remain", "Not yet reviewed"].includes(String(processes.goalCoverage))) question("Goal coverage", processes.coverageNotes || "Coverage needs review");
  for (const stateKey of ["useCaseCatalog", "casualDescriptions", "useCaseMap", "activityWorkflows", "detailedDescriptions", "atomicRequirements"].slice(0, behaviorRank + 1)) {
    const local = asDataModel(asDataModel(srs.functionalBehaviorDescription)[stateKey]);
    if (local.reviewStatus === "Reviewed with open questions") question(`${stateKey} review`, local.reviewNotes || "Behavior review has unanswered questions");
  }
  for (const item of (records.useCases || []).filter(item => live(item) && ["Candidate", "Ready for elaboration", "Needs clarification"].includes(String(item.disposition)))) {
    const id = idFor("SRS-UC-", item);
    if (behaviorRank >= 1) question(`${id} casual questions`, item.casualQuestions);
    if (behaviorRank >= 4) question(`${id} detailed questions`, item.detailQuestions);
  }
  if (behaviorRank >= 5) {
    for (const item of (records.requirements || []).filter(item => live(item) && !["Deferred", "Rejected"].includes(String(item.status))
      && (phase >= 4 || (item.requirementKind || "Functional") === "Functional"))) question(`${requirementReferenceId(item)} open questions`, item.openQuestions);
  }
  for (const item of (records.artifacts || []).filter(item => live(item) && item.figureStatus === "Reviewed with differences"
    && ((item.artifactGroup === "use-case-map" && behaviorRank >= 2) || (item.artifactGroup === "activity-workflow" && behaviorRank >= 3)))) {
    question(`${idFor("FIG-", item)} differences`, item.figureFindings || "Unresolved diagram differences");
  }
  return {
    messages,
    catalog: {
      title: "Shared questions and resolutions", items: issues,
      target: { pageId: "software-requirements-specification", subpageSelections: {
        "software-requirements-specification": "srs-establish-baseline", "srs-establish-baseline": "srs-baseline-evidence-intake"
      }, anchorId: "srs-baseline-evidence-intake-baseline-exceptions" }
    }
  };
}
