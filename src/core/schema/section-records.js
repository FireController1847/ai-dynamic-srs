import { fieldVisible } from "./field-visibility.js";

export function sectionRecords(repeatable, dataModel) {
  const records = dataModel?.[repeatable.dataKey];
  return (Array.isArray(records) ? records : []).filter((record) => (
    record && !record._retired && !record.retired
    && (!repeatable.recordFilter || fieldVisible({ showWhen: repeatable.recordFilter }, record))
  ));
}
