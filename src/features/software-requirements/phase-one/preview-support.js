import { hasNonDefaultValue, hasValue } from "../../../core/records/record-values.js";
import { dataModelForSection } from "../../../core/schema/data-models.js";
import { documentOutlineIndex } from "../../../core/schema/schema-tree.js";
import { softwareRequirementsDocument } from "../document-outline.js";

const outlineIndex = documentOutlineIndex(softwareRequirementsDocument.outline);

export function outlineNumber(targetKey) {
  return outlineIndex.get(targetKey)?.number || "";
}

export function childNumber(targetKey, position) {
  const parentNumber = outlineNumber(targetKey);
  return parentNumber ? `${parentNumber}.${position}` : "";
}

export function field(key, label, type = "textarea") {
  return { key, label, type };
}

export function activeRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && !record._retired && !record.retired);
}

export function populatedRecords(records = [], fields = []) {
  return activeRecords(records).filter((record) => (
    fields.length
      ? fields.some((candidate) => hasNonDefaultValue(record[candidate.key], candidate.default))
      : hasValue(record)
  ));
}

export function rootRecords(documentModel) {
  return documentModel.softwareRequirementsSpecification?.records || {};
}

export function sourceData(documentModel, documentSchemas, pageId) {
  const schema = documentSchemas.find(({ id }) => id === pageId);
  return {
    data: schema ? documentModel[schema.stateKey] || {} : {},
    schema
  };
}

function sourceField(section, key) {
  const fields = section?.repeatable?.fields || section?.fields || [];
  return fields.find((candidate) => candidate.key === key) || { key };
}

export function schemaSection(schema, sectionId) {
  return schema?.sections?.find(({ id }) => id === sectionId);
}

export function stageSection(stage, sectionId) {
  return schemaSection(stage, sectionId);
}

export function decisionStatements(decisions, decisionType) {
  return decisions
    .filter((decision) => decision.status === "Confirmed" && decision.decisionType === decisionType)
    .map(({ statement }) => String(statement || "").trim())
    .filter(Boolean)
    .join("\n");
}

function referencesRecordId(decision, recordId) {
  const referenceIds = String(decision.sourceReferences || "")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9-]+/g, " ")
    .split(" ")
    .filter(Boolean);
  return referenceIds.includes(String(recordId).toUpperCase());
}

export function latestFeatureDecision(decisions, recordId) {
  return [...decisions].reverse().find((decision) => (
    decision.status === "Confirmed"
    && ["Include", "Exclude", "Defer"].includes(decision.decisionType)
    && String(decision.statement || "").trim()
    && referencesRecordId(decision, recordId)
  ));
}

export function carriedFeatureDisposition(scopeDisposition, decision, decisionId) {
  if (decision?.decisionType === "Include") {
    return `Confirmed in scope by ${decisionId}`;
  }

  const dispositionLabels = {
    "Accepted from prior evidence": "Carried forward by the accepted scope baseline",
    "Accepted with clarification": "Carried forward subject to the documented scope clarification",
    "Requires reconciliation": "Candidate feature; scope reconciliation remains open",
    "Blocked by conflict or missing decision": "Candidate feature; the scope baseline is blocked"
  };
  return dispositionLabels[scopeDisposition]
    || "Candidate feature from the System Request; scope review is pending";
}

export function sourceHasMeaningfulEvidence(definition, schema, data, documentModel) {
  return (definition.groups || []).some((group) => {
    const section = schemaSection(schema, group.sectionId);
    if (!section) {
      return false;
    }

    const sectionData = dataModelForSection(section, data, documentModel);
    if (section.repeatable) {
      const keys = group.recordFieldKeys || section.repeatable.fields.map(({ key }) => key);
      return activeRecords(sectionData[section.repeatable.dataKey]).some((record) => (
        keys.some((key) => hasNonDefaultValue(record[key], sourceField(section, key)?.default))
      ));
    }

    const keys = group.fieldKeys || (section.fields || []).map(({ key }) => key);
    return keys.some((key) => hasNonDefaultValue(sectionData[key], sourceField(section, key)?.default));
  });
}

export function evidenceLines(entries) {
  return entries
    .filter(([, value]) => hasValue(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}

export function previewPage(stage, sections) {
  return {
    id: stage.id,
    code: stage.code,
    label: "Software Requirements Specification",
    title: "Software Requirements Specification",
    partialTitle: stage.title || stage.label,
    description: stage.description,
    sections
  };
}
