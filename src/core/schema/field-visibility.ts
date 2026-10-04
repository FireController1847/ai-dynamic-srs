import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from './schema-types.ts';
export function fieldVisible(field: Pick<Field, "showWhen">, source: DataModel) {
  if (!field.showWhen) {
    return true;
  }

  const matches = (condition: Condition) => {
    const actual = condition.key ? source[condition.key] : undefined;
    if (Array.isArray(condition.notIn)) return !condition.notIn.includes(actual);
    if (condition.notEmpty) return actual !== undefined && actual !== null && String(actual).trim() !== "";
    return Array.isArray(condition.in)
      ? condition.in.includes(actual)
      : actual === condition.equals;
  };

  return Array.isArray(field.showWhen.all)
    ? field.showWhen.all.every(matches)
    : matches(field.showWhen);
}
