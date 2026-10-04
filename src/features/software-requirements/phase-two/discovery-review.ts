import type { DataModel, DocumentModel, SchemaNode, Field, Section, Repeater, RecordReview, ReviewRecord, ReviewCatalog } from '../../../core/schema/schema-types.ts';
import type { SrsRecords } from '../record-types.ts';
import { srsRecords } from '../record-types.ts';
import { recordItems } from "../../../core/schema/data-models.ts";
import { formatRecordDisplayId, hasNonDefaultValue } from "../../../core/records/record-values.ts";
import { stakeholderPerspectivesStage } from "./stakeholder-perspectives.ts";
import { actorsGoalsStage } from "./actors-goals.ts";
import { candidateProcessesStage } from "./candidate-processes.ts";

function references(value: unknown) {
  return String(value || "").trim().toUpperCase().split(/[\s,;]+/).filter(Boolean);
}

function catalog(stage: SchemaNode, sectionId: string, records: SrsRecords): ReviewCatalog {
  const section = (stage.sections || []).find(({ id }) => id === sectionId)!;
  const repeatable = section.repeatable!;
  const items = recordItems(records[repeatable.dataKey])
    .filter((record) => record && !record._retired && !record.retired)
    .filter((record) => repeatable.fields.some((field) => hasNonDefaultValue(record[field.key], field.default)))
    .map((record, index): ReviewRecord => ({
      ...record,
      referenceId: formatRecordDisplayId(repeatable.displayId, record, index),
      label: record[repeatable.primaryField || ""] || "Unnamed record"
    }));
  return { title: section.title, stageId: stage.id, sectionId, items };
}

export function discoveryReview(stageId: string, documentModel: DocumentModel): RecordReview {
  const records = srsRecords(documentModel);
  const perspectives = catalog(stakeholderPerspectivesStage, "stakeholder-perspectives", records);
  const actors = catalog(actorsGoalsStage, "actor-catalog", records);
  const goals = catalog(actorsGoalsStage, "goal-catalog", records);
  const useCases = catalog(candidateProcessesStage, "candidate-use-cases", records);
  const processStage = stageId === candidateProcessesStage.id;
  const messages = [];
  const eligibleActors = actors.items.filter(({ status }) => status !== "Not an actor");
  const activeGoals = goals.items.filter(({ scopeStatus }) => !["Deferred", "Excluded"].includes(String(scopeStatus)));
  const activeCases = useCases.items.filter(({ disposition }) => !["Deferred", "Excluded"].includes(String(disposition)));
  const actorIds = new Set(eligibleActors.map(({ referenceId }) => referenceId));

  function checkLinks(record: DataModel, field: string, targetItems: ReviewRecord[], required: boolean = false) {
    const ids = references(record[field]);
    const targetIds = new Set(targetItems.map(({ referenceId }) => referenceId));
    if (required && !ids.length) messages.push(`${record.referenceId}: add ${field === "actorId" || field === "primaryActorId" ? "an actor reference" : "goal references"}.`);
    for (const id of ids) {
      if (!targetIds.has(id)) messages.push(`${record.referenceId}: ${id} is missing, retired, or unavailable for this relationship.`);
    }
    return ids;
  }

  for (const actor of eligibleActors) {
    checkLinks(actor, "perspectiveReferences", perspectives.items);
    if (!String(actor.perspectiveReferences || "").trim() && !String(actor.sourceReferences || "").trim()) {
      messages.push(`${actor.referenceId}: cite a perspective or another source for this role.`);
    }
    if (["Seeks an outcome", "Both"].includes(String(actor.participation))
      && !activeGoals.some((goal) => references(goal.actorId).includes(String(actor.referenceId)))) {
      messages.push(`${actor.referenceId}: no current goal is linked to this outcome-seeking role.`);
    }
  }
  for (const perspective of perspectives.items.filter(({ interaction }) => interaction === "Direct interaction expected")) {
    if (!eligibleActors.some((actor) => references(actor.perspectiveReferences).includes(String(perspective.referenceId)))) {
      messages.push(`${perspective.referenceId}: direct interaction is expected, but no actor references this perspective.`);
    }
  }
  for (const goal of activeGoals) {
    const ids = checkLinks(goal, "actorId", eligibleActors, true);
    if (ids.length > 1) messages.push(`${goal.referenceId}: choose one actor for this goal.`);
    if (["Proposed", "Needs scope decision"].includes(String(goal.scopeStatus))) {
      messages.push(`${goal.referenceId}: scope support still needs review.`);
    }
  }
  if (processStage) {
    for (const useCase of activeCases) {
      const primaryIds = checkLinks(useCase, "primaryActorId", eligibleActors, true);
      if (primaryIds.length > 1) messages.push(`${useCase.referenceId}: choose one primary actor.`);
      checkLinks(useCase, "supportingActorReferences", eligibleActors);
      const goalIds = checkLinks(useCase, "goalReferences", activeGoals, true);
      const linkedGoals = activeGoals.filter(({ referenceId }) => goalIds.includes(referenceId));
      if (linkedGoals.length && primaryIds.length === 1 && actorIds.has(primaryIds[0])
        && !linkedGoals.some((goal) => references(goal.actorId).includes(primaryIds[0]))) {
        messages.push(`${useCase.referenceId}: none of its linked goals belongs to its primary actor.`);
      }
      if (useCase.disposition === "Ready for elaboration"
        && linkedGoals.some(({ scopeStatus }) => scopeStatus !== "Supported by baseline")) {
        messages.push(`${useCase.referenceId}: a linked goal still needs scope confirmation.`);
      }
      if (useCase.disposition === "Ready for elaboration"
        && !String(useCase.name || "").trim()) {
        messages.push(`${useCase.referenceId}: record its name before marking it ready. Short descriptions belong in Casual Descriptions; triggers belong in Detailed Descriptions.`);
      }
    }
    for (const goal of activeGoals.filter(({ scopeStatus }) => scopeStatus === "Supported by baseline")) {
      if (!activeCases.some((useCase) => references(useCase.goalReferences).includes(String(goal.referenceId)))) {
        messages.push(`${goal.referenceId}: no current candidate process covers this in-scope goal.`);
      }
    }
  }
  return {
    messages: [...new Set(messages)],
    catalogs: processStage ? [actors, goals, useCases] : [perspectives, actors, goals]
  };
}
