import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from '../schema/schema-types.ts';
export function hasValue(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasValue(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, item]) => key !== "id" && hasValue(item));
  }

  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function hasNonDefaultValue(value: unknown, defaultValue: unknown) {
  return hasValue(value)
    && JSON.stringify(value) !== JSON.stringify(defaultValue);
}

export function displayValue(value: unknown, fallback: string = "Not provided") {
  return hasValue(value) ? value : fallback;
}

export function resolveContextValue(localState: DataModel | undefined, contextState: DataModel | undefined, key: string) {
  const localValue = localState?.[key];
  return hasValue(localValue) ? localValue : contextState?.[key];
}

export function nextNumericId(records: DataModel[] = []) {
  return Math.max(0, ...records.map((record) => Number(record?.id) || 0)) + 1;
}

export function formatDisplayId(config: DisplayId | undefined, index: number) {
  return config
    ? `${config.prefix}${String(index + 1).padStart(config.padding, "0")}`
    : String(index + 1);
}

export function formatRecordDisplayId(config: DisplayId | undefined, record: DataModel, fallbackIndex: number = 0) {
  const numericId = Number(record?.id);
  const stableIndex = Number.isFinite(numericId) && numericId > 0 ? numericId - 1 : fallbackIndex;
  return formatDisplayId(config, stableIndex);
}
