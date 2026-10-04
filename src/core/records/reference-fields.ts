import type { DataModel, Field, ParentChoice, Reference } from '../schema/schema-types.ts';
import { fieldVisible } from "../schema/field-visibility.ts";
import { recordItems, valueAtPath } from "../schema/data-models.ts";
import { formatRecordDisplayId, hasValue } from "./record-values.ts";

export function referenceChoices(reference: Reference, documentModel: DataModel): ParentChoice[] {
  const records = valueAtPath(documentModel, reference.dataPath);
  return recordItems(records)
    .filter((record) => record && !record._retired && !record.retired && hasValue(record[reference.labelField])
      && (!reference.recordFilter || fieldVisible({ showWhen: reference.recordFilter }, record)))
    .map((record, index) => {
      const value = formatRecordDisplayId(reference.displayId, record, index);
      return { value, label: `${value} — ${record[reference.labelField]}` };
    });
}

export function resolveReferenceField(field: Field, documentModel: DataModel, currentValue: unknown) {
  if (!field.reference || field.type === "record-links") return field;
  const options = referenceChoices(field.reference, documentModel);
  // Retired or renamed references remain visible until the user resolves them.
  if (hasValue(currentValue) && !options.some(({ value }) => value === currentValue)) {
    options.push({ value: String(currentValue), label: `${currentValue} — unavailable reference` });
  }
  return { ...field, options: [{ value: "", label: "Select a record" }, ...options], placeholder: "" };
}
