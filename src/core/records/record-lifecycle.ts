import type { DataModel, DisplayId, Repeater } from '../schema/schema-types.ts';
import { formatRecordDisplayId } from './record-values.ts';

function identifierCharacter(value: string) {
  return /^[A-Z0-9_-]$/i.test(value);
}

function textReferencesId(value: string, referenceId: string) {
  const text = value.toUpperCase();
  const id = referenceId.toUpperCase();
  let index = text.indexOf(id);

  while (index >= 0) {
    const before = index > 0 ? text[index - 1] : "";
    const afterIndex = index + id.length;
    const after = afterIndex < text.length ? text[afterIndex] : "";

    if ((!before || !identifierCharacter(before)) && (!after || !identifierCharacter(after))) {
      return true;
    }

    index = text.indexOf(id, index + id.length);
  }

  return false;
}

function containsReference(
  value: unknown,
  referenceId: string,
  skippedRecord?: DataModel,
  visited: Set<object> = new Set()
): boolean {
  if (value === skippedRecord) return false;
  if (typeof value === "string") return textReferencesId(value, referenceId);
  if (!value || typeof value !== "object") return false;

  const objectValue = value as object;
  if (visited.has(objectValue)) return false;
  visited.add(objectValue);

  if (Array.isArray(value)) {
    return value.some((item) => containsReference(item, referenceId, skippedRecord, visited));
  }

  return Object.values(value as DataModel)
    .some((item) => containsReference(item, referenceId, skippedRecord, visited));
}

export function recordIdIsReferenced(documentModel: DataModel, referenceId: string, skippedRecord?: DataModel) {
  return containsReference(documentModel, referenceId, skippedRecord);
}

function usedNumericIds(records: DataModel[]) {
  return new Set(
    records
      .map((record) => Number(record?.id))
      .filter((id) => Number.isSafeInteger(id) && id > 0)
  );
}

export function nextReferenceSafeNumericId(
  records: DataModel[],
  displayId: DisplayId | undefined,
  documentModel: DataModel
) {
  const usedIds = usedNumericIds(records);
  let candidate = 1;

  while (
    usedIds.has(candidate)
    || (
      displayId
      && recordIdIsReferenced(
        documentModel,
        formatRecordDisplayId(displayId, { id: candidate })
      )
    )
  ) {
    candidate += 1;
  }

  return candidate;
}

export function nextRepeaterRecordId(repeater: Repeater, records: DataModel[], documentModel: DataModel) {
  return nextReferenceSafeNumericId(records, repeater.displayId, documentModel);
}

export function removeRepeaterRecord(
  repeater: Repeater,
  records: DataModel[],
  item: DataModel,
  documentModel: DataModel
) {
  const index = records.indexOf(item);
  if (index < 0) return "missing" as const;

  if (repeater.displayId) {
    const referenceId = formatRecordDisplayId(repeater.displayId, item);
    if (recordIdIsReferenced(documentModel, referenceId, item)) {
      item._retired = true;
      return "retired" as const;
    }
  } else if (repeater.stableIds) {
    item._retired = true;
    return "retired" as const;
  }

  records.splice(index, 1);
  return "removed" as const;
}
