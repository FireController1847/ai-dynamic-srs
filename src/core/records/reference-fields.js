import { fieldVisible } from "../schema/field-visibility.js";
import { valueAtPath } from "../schema/data-models.js";
import { formatRecordDisplayId, hasValue } from "./record-values.js";

export function referenceChoices(reference, documentModel) {
  const records = valueAtPath(documentModel, reference.dataPath);
  return (Array.isArray(records) ? records : [])
    .filter((record) => record && !record._retired && !record.retired && hasValue(record[reference.labelField])
      && (!reference.recordFilter || fieldVisible({ showWhen: reference.recordFilter }, record)))
    .map((record, index) => {
      const value = formatRecordDisplayId(reference.displayId, record, index);
      return { value, label: `${value} — ${record[reference.labelField]}` };
    });
}

export function resolveReferenceField(field, documentModel, currentValue) {
  if (!field.reference || field.type === "record-links") return field;
  const options = referenceChoices(field.reference, documentModel);
  // Retired or renamed references remain visible until the user resolves them.
  if (hasValue(currentValue) && !options.some(({ value }) => value === currentValue)) {
    options.push({ value: currentValue, label: `${currentValue} — unavailable reference` });
  }
  return { ...field, options: [{ value: "", label: "Select a record" }, ...options], placeholder: "" };
}
