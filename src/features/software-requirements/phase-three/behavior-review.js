import { sectionRecords } from "../../../core/schema/section-records.js";
import { formatRecordDisplayId, hasNonDefaultValue } from "../../../core/records/record-values.js";
import { phaseThreeStages } from "./stages.js";
import { discoveryReview } from "../phase-two/discovery-review.js";
import { followThroughReview } from "../follow-through-review.js";
import { availableSrsIds, missingReferenceMessages } from "../record-review.js";
import { activeCases } from "./shared.js";

const refs = (value) => String(value || "").trim().toUpperCase().split(/[\s,;]+/).filter(Boolean);
const present = (value) => Boolean(String(value || "").trim());

function catalog(stage, sectionId, records) {
  const section = stage.sections.find(({ id }) => id === sectionId);
  const rep = section.repeatable;
  const items = sectionRecords(rep, records)
    .filter((record) => rep.fields.some((field) => hasNonDefaultValue(record[field.key], field.default)))
    .map((record, index) => ({ ...record, referenceId: formatRecordDisplayId(rep.displayId, record, index), label: record[rep.primaryField] || "Unnamed record" }));
  return {
    title: section.title, items,
    target: {
      pageId: "software-requirements-specification",
      subpageSelections: { "software-requirements-specification": "srs-describe-functional-behavior", "srs-describe-functional-behavior": stage.id },
      anchorId: `${stage.id}-${section.id}`
    }
  };
}

export function behaviorReview(stageId, documentModel, phase = 3) {
  const rank = phaseThreeStages.findIndex(({ id }) => id === stageId);
  const records = documentModel.softwareRequirementsSpecification?.records || {};
  const cases = catalog(phaseThreeStages[0], "use-case-catalog", records);
  const relationships = catalog(phaseThreeStages[0], "use-case-relationships", records);
  const maps = catalog(phaseThreeStages[2], "use-case-figures", records);
  const activities = catalog(phaseThreeStages[3], "activity-figures", records);
  const requirements = catalog(phaseThreeStages[5], "functional-requirements", records);
  const discovery = discoveryReview("srs-discovery-processes", documentModel);
  const active = sectionRecords({ dataKey: "items", recordFilter: activeCases }, cases);
  const activeRequirements = requirements.items.filter(({ status }) => !["Deferred", "Rejected"].includes(status));
  const handoff = followThroughReview(documentModel, phase, rank);
  const messages = [...discovery.messages, ...handoff.messages];
  const available = availableSrsIds(records);
  const actors = discovery.catalogs[0].items.filter(({ status }) => status !== "Not an actor");
  const allFigures = [...maps.items, ...activities.items];

  function links(record, field, targets, required = false) {
    const ids = refs(record[field]);
    const label = { fromUseCaseId: "a source use case", toUseCaseId: "a target use case", useCaseReferences: "source use-case IDs" }[field] || "the missing references";
    if (required && !ids.length) messages.push(`${record.referenceId}: add ${label} to retain traceability.`);
    for (const id of ids) {
      if (!targets.some(({ referenceId }) => referenceId === id)) messages.push(`${record.referenceId}: ${id} is missing, retired, or not active for this relationship.`);
    }
    return ids;
  }
  for (const relationship of relationships.items) {
    links(relationship, "fromUseCaseId", active, true);
    links(relationship, "toUseCaseId", active, true);
    if (relationship.fromUseCaseId && relationship.fromUseCaseId === relationship.toUseCaseId) messages.push(`${relationship.referenceId}: a use case cannot relate to itself.`);
    if (relationship.relationship === "Extends" && !present(relationship.condition)) messages.push(`${relationship.referenceId}: identify the extension condition or point.`);
  }
  for (const kind of ["Includes", "Specializes"]) {
    const edges = relationships.items.filter(({ relationship }) => relationship === kind);
    const visiting = new Set();
    const visited = new Set();
    function hasCycle(id) {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      if (edges.filter(({ fromUseCaseId }) => fromUseCaseId === id)
        .some(({ toUseCaseId }) => hasCycle(toUseCaseId))) return true;
      visiting.delete(id);
      visited.add(id);
      return false;
    }
    if (edges.some(({ fromUseCaseId }) => hasCycle(fromUseCaseId))) messages.push(`${kind}: circular relationships need reconciliation.`);
  }
  for (const item of active) {
    if (!present(item.detailLevel) || item.detailLevel === "Not yet decided") messages.push(`${item.referenceId}: decide whether an overview or detailed description is needed.`);
    if (rank >= 1 && !present(item.casualStory)) messages.push(`${item.referenceId}: no casual success story is recorded.`);
    if (rank >= 1 && (!present(item.preconditions) || !present(item.successGuarantee))) messages.push(`${item.referenceId}: state the preconditions (or explicitly none) and observable successful outcome.`);
    if (rank >= 4) {
      if (item.detailLevel === "Overview sufficient" && !present(item.detailReason)) messages.push(`${item.referenceId}: explain why an overview is sufficient.`);
      if (item.detailLevel === "Detailed description needed") {
        if (!present(item.normalFlow)) messages.push(`${item.referenceId}: its detailed normal flow is missing.`);
        if (!present(item.alternativeFlows)) messages.push(`${item.referenceId}: review alternate/exceptional paths or explicitly record none identified.`);
        const supportingWorkflow = activities.items.some(figure => refs(item.figureReferences).includes(figure.referenceId)
          && figure.file?.content && refs(figure.useCaseReferences).includes(item.referenceId));
        if (!supportingWorkflow && !present(item.workflowEvidenceNotes)) messages.push(`${item.referenceId}: cite an uploaded activity figure covering this use case, or explain the walkthrough evidence in workflow evidence notes.`);
      }
      links(item, "figureReferences", allFigures);
    }
  }
  const figures = rank === 2 ? maps.items : rank >= 3 ? allFigures : [];
  for (const item of figures) {
    if (!item.file?.content) messages.push(`${item.referenceId}: no diagram file is attached.`);
    if (!present(item.title)) messages.push(`${item.referenceId}: add a descriptive figure title.`);
    if (!present(item.caption)) messages.push(`${item.referenceId}: add a caption explaining the figure.`);
    links(item, "useCaseReferences", active, true);
    links(item, "actorReferences", actors);
    if (item.artifactGroup === "use-case-map") links(item, "relationshipReferences", relationships.items);
  }
  if (rank >= 2) {
    for (const item of active) {
      if (!maps.items.some((figure) => figure.file?.content && refs(figure.useCaseReferences).includes(item.referenceId))) messages.push(`${item.referenceId}: not referenced by an uploaded use-case map.`);
    }
  }
  if (rank >= 5) {
    for (const requirement of activeRequirements) {
      links(requirement, "useCaseReferences", active, true);
      if (!present(requirement.acceptanceCriterion)) messages.push(`${requirement.referenceId}: add an observable acceptance criterion.`);
      if (!present(requirement.verificationMethod)) messages.push(`${requirement.referenceId}: choose a verification method.`);
      if (!present(requirement.flowReferences)) messages.push(`${requirement.referenceId}: cite the source step, path, or casual-story outcome so later models can challenge this obligation.`);
      messages.push(...missingReferenceMessages(requirement, ["sourceReferences", "flowReferences"], available));
      for (const id of (requirement.flowReferences || "").toUpperCase().match(/SRS-UC-\d+/g) || []) {
        if (!refs(requirement.useCaseReferences).includes(id)) messages.push(`${requirement.referenceId}: ${id} appears in the source path but not in source use cases; reconcile the trace.`);
      }
      if (!present(requirement.statement)) messages.push(`${requirement.referenceId}: the requirement statement is missing.`);
    }
    for (const item of active) {
      if (!activeRequirements.some((requirement) => refs(requirement.useCaseReferences).includes(item.referenceId))) messages.push(`${item.referenceId}: no functional requirement references this use case.`);
    }
  }
  return { messages: [...new Set(messages)], catalogs: [cases, relationships, ...(rank >= 2 ? [maps] : []), ...(rank >= 3 ? [activities] : []), ...(rank >= 5 ? [requirements] : []), handoff.catalog] };
}
