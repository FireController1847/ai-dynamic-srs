import { connectedEvidence, evidenceSectionHasContent } from '../../../core/evidence/evidence-model.ts';
import type { DataModel, DocumentModel, EvidenceSource, Field, SchemaNode, Section } from "../../../core/schema/schema-types.ts";
import { hasNonDefaultValue, hasValue } from "../../../core/records/record-values.ts";
import { asDataModel, isDataModel } from "../../../core/schema/data-models.ts";
import { documentOutlineIndex } from "../../../core/schema/schema-tree.ts";
import { softwareRequirementsDocument } from "../document-outline.ts";

const outlineIndex = documentOutlineIndex(softwareRequirementsDocument.outline || []);

export function outlineNumber(targetKey: string) {
  return outlineIndex.get(targetKey)?.number || "";
}

export function childNumber(targetKey: string, position: number) {
  const parentNumber = outlineNumber(targetKey);
  return parentNumber ? `${parentNumber}.${position}` : "";
}

export function field(key: string, label: string, type: string = "textarea"): Field {
  return { key, label, type };
}

export function activeRecords(records: unknown = []): DataModel[] {
  return (Array.isArray(records) ? records.filter(isDataModel) : [])
    .filter((record) => !record._retired && !record.retired);
}

export function populatedRecords(records: unknown = [], fields: readonly Field[] = []): DataModel[] {
  return activeRecords(records).filter((record) => (
    fields.length
      ? fields.some((candidate) => hasNonDefaultValue(record[candidate.key], candidate.default))
      : hasValue(record)
  ));
}

export function rootRecords(documentModel: DocumentModel): DataModel {
  return asDataModel(asDataModel(documentModel.softwareRequirementsSpecification).records);
}

export function sourceData(documentModel: DocumentModel, documentSchemas: readonly SchemaNode[], pageId: string): { data: DataModel; schema?: SchemaNode } {
  const schema = documentSchemas.find(({ id }) => id === pageId);
  return {
    data: schema ? asDataModel(documentModel[schema.stateKey]) : {},
    schema
  };
}

export function schemaSection(schema: SchemaNode | undefined, sectionId: string): Section | undefined {
  return schema?.sections?.find(({ id }) => id === sectionId);
}

export function stageSection(stage: SchemaNode, sectionId: string): Section | undefined {
  return schemaSection(stage, sectionId);
}

export function decisionStatements(decisions: readonly DataModel[], decisionType: string) {
  return decisions
    .filter((decision) => decision.status === "Confirmed" && decision.decisionType === decisionType)
    .map(({ statement }) => String(statement || "").trim())
    .filter(Boolean)
    .join("\n");
}

function referencesRecordId(decision: DataModel, recordId: string) {
  const referenceIds = String(decision.sourceReferences || "")
    .toUpperCase()
    .replaceAll(/[^A-Z0-9-]+/g, " ")
    .split(" ")
    .filter(Boolean);
  return referenceIds.includes(String(recordId).toUpperCase());
}

export function latestFeatureDecision(decisions: readonly DataModel[], recordId: string): DataModel | undefined {
  return [...decisions].reverse().find((decision) => (
    decision.status === "Confirmed"
    && ["Include", "Exclude", "Defer"].includes(String(decision.decisionType || ""))
    && String(decision.statement || "").trim()
    && referencesRecordId(decision, recordId)
  ));
}

export function carriedFeatureDisposition(scopeDisposition: unknown, decision: DataModel | undefined, decisionId: string) {
  if (decision?.decisionType === "Include") {
    return `Confirmed in scope by ${decisionId}`;
  }

  const dispositionLabels: Record<string, string> = {
    "Accepted from prior evidence": "Carried forward by the accepted scope baseline",
    "Accepted with clarification": "Carried forward subject to the documented scope clarification",
    "Requires reconciliation": "Candidate feature; scope reconciliation remains open",
    "Blocked by conflict or missing decision": "Candidate feature; the scope baseline is blocked"
  };
  return (typeof scopeDisposition === "string" ? dispositionLabels[scopeDisposition] : undefined)
    || "Candidate feature from the System Request; scope review is pending";
}

export function sourceHasMeaningfulEvidence(definition: EvidenceSource, schema: SchemaNode, _data: DataModel, documentModel: DocumentModel): boolean {
  return connectedEvidence({ sources: [definition] }, documentModel, [schema])
    .some(source => source.groups.some(evidenceSectionHasContent));
}

export function evidenceLines(entries: readonly (readonly [string, unknown])[]) {
  return entries
    .filter(([, value]) => hasValue(value))
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n\n");
}

export function previewPage(stage: SchemaNode, sections: Section[]): SchemaNode {
  return {
    id: stage.id,
    stateKey: stage.stateKey,
    code: stage.code,
    label: "Software Requirements Specification",
    title: "Software Requirements Specification",
    partialTitle: stage.title || stage.label,
    description: stage.description,
    sections
  };
}
