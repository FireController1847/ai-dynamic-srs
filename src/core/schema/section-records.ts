import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from './schema-types.ts';
import { recordItems } from "./data-models.ts";
import { fieldVisible } from "./field-visibility.ts";

export function sectionRecords(repeatable: Pick<Repeater, "dataKey" | "recordFilter">, dataModel: DataModel) {
  const records = dataModel?.[repeatable.dataKey];
  return recordItems(records).filter((record) => (
    record && !record._retired && !record.retired
    && (!repeatable.recordFilter || fieldVisible({ showWhen: repeatable.recordFilter }, record))
  ));
}
