import { valueAtPath } from "../schema/data-models.js";
import { sectionRecords } from "../schema/section-records.js";
import { fieldVisible } from "../schema/field-visibility.js";
import { formatRecordDisplayId } from "./record-values.js";

// A display grouping over canonical records, never nested saved copies.
export function parentRecordGroups(repeatable, sectionModel, documentModel) {
  const config = repeatable.parent;
  const reference = config.reference;
  const records = valueAtPath(documentModel, reference.dataPath) || [];
  const parents = records.filter(record => record && !record._retired && !record.retired
    && (!config.recordFilter || fieldVisible({ showWhen: config.recordFilter }, record)))
    .map(record => ({
      value: formatRecordDisplayId(reference.displayId, record),
      label: record[reference.labelField] || `Unnamed ${config.label.toLowerCase()}`
    }));
  const children = sectionRecords(repeatable, sectionModel);
  const known = new Set(parents.map(parent => parent.value));
  return {
    parents,
    groups: parents.map(parent => ({ ...parent, items: children.filter(item => item[config.fieldKey] === parent.value) })),
    ungrouped: children.filter(item => !known.has(item[config.fieldKey]))
  };
}

export function parentScopedSection(section, parent) {
  const { repeatable } = section;
  const config = repeatable.parent;
  const previous = repeatable.recordFilter;
  return {
    ...section, key: `${section.key}-parent-${parent.value}`,
    title: `${section.title} — ${parent.label} (${parent.value})`,
    ai: { ...section.ai, draftingGuidance: `Complete only records under ${config.label.toLowerCase()} ${parent.label} (${parent.value}). The form sets ${config.fieldKey}; omit that field from answers. Preserve existing child IDs.` },
    repeatable: {
      ...repeatable,
      fields: repeatable.fields.map(field => field.key === config.fieldKey ? { ...field, includeInPrompt: false } : field),
      recordFilter: { all: [...(previous ? previous.all || [previous] : []), { key: config.fieldKey, equals: parent.value }] }
    }
  };
}
