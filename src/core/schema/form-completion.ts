import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from './schema-types.ts';
import { hasNonDefaultValue, hasValue } from "../records/record-values.ts";
import { asDataModel, dataModelForSection } from "./data-models.ts";
import { fieldVisible } from "./field-visibility.ts";
import { sectionRecords } from "./section-records.ts";

function repeatableCompletionFields(repeater: Repeater) {
  return (repeater.fields || []).filter((field) => (
    field.editable !== false
    && field.completion !== false
    && !field.hidden
    && !field.optional
    && (repeater.completionMode !== "all-required"
      || field.completion === true
      || repeater.completionFields?.includes(field.key))
  ));
}

function repeatableItemIsComplete(repeater: Repeater, item: DataModel) {
  const eligibleFields = repeatableCompletionFields(repeater)
    .filter((field) => fieldVisible(field, item));
  if (repeater.completionMode === "all-required") {
    return eligibleFields.length > 0 && eligibleFields.every(field => hasValue(item[field.key]));
  }
  const minimumCompletedFields = Math.max(1, Math.ceil(eligibleFields.length / 3));
  const completedFields = eligibleFields.filter((field) => (
    hasNonDefaultValue(item[field.key], field.default)
  )).length;

  return completedFields >= minimumCompletedFields;
}

export function hasCompletionCriteria(page: SchemaNode) {
  return completionSummary(page, {}, {}).total > 0;
}

export function completionSummary(page: SchemaNode, dataModel: DataModel = {}, documentModel: DataModel = dataModel): { completed: number; total: number } {
  if (page.form?.showCompletion === false) {
    return { completed: 0, total: 0 };
  }

  if (page.subpages?.length) {
    return page.subpages.reduce((summary, subpage) => {
      const childSummary = completionSummary(subpage, asDataModel(dataModel[subpage.stateKey]), documentModel);
      summary.completed += childSummary.completed;
      summary.total += childSummary.total;
      return summary;
    }, { completed: 0, total: 0 });
  }

  const checks: boolean[] = [];

  for (const section of page.sections || []) {
    const sectionModel = dataModelForSection(section, dataModel, documentModel);

    if (section.repeatable?.completionFields?.length) {
      if (!repeatableCompletionFields(section.repeatable).length) {
        continue;
      }

      const items = sectionRecords(section.repeatable, sectionModel);
      const minimum = Math.max(0, Number(section.repeatable.completionMinimum ?? section.repeatable.minimum) || 0);

      if (!items.length) {
        checks.push(...Array.from({ length: minimum }, () => false));
        continue;
      }

      checks.push(...items.map((item) => repeatableItemIsComplete(section.repeatable!, item)));
      checks.push(...Array.from({ length: Math.max(0, minimum - items.length) }, () => false));
      continue;
    }

    for (const field of section.fields || []) {
      if (field.completion && field.editable !== false && !field.hidden
        && !field.optional && fieldVisible(field, sectionModel)) {
        checks.push(hasValue(sectionModel[field.key]));
      }
    }
  }

  if (!checks.length && page.workflow?.required) {
    checks.push(false);
  }

  return {
    completed: checks.filter(Boolean).length,
    total: checks.length
  };
}

export function completion(page: SchemaNode, dataModel: DataModel = {}, documentModel: DataModel = dataModel) {
  const summary = completionSummary(page, dataModel, documentModel);
  return summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
}

export function isFormComplete(page: SchemaNode, dataModel: DataModel, documentModel: DataModel = dataModel) {
  const summary = completionSummary(page, dataModel, documentModel);
  return summary.total > 0 && summary.completed === summary.total;
}
