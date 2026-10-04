import type { DataModel, DocumentModel, DataPath, RecordItem, Field, FieldOption, Section, Repeater, SchemaNode, Condition, DisplayId, Reference, DocumentConfig, OutlineSection, Evidence, EvidenceGroup, EvidenceSource } from './schema-types.ts';
import { ensureRecordAtPath } from "./data-models.ts";

function clone<T>(value: T): T {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value)) as T;
}

function cloneRecord(value: unknown): DataModel {
  return value && typeof value === "object" && !Array.isArray(value)
    ? clone(value) as DataModel
    : {};
}

function positiveInteger(value: unknown) {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function normalizeRecordCollection(records: unknown[], createItem: (id: number, item: DataModel) => RecordItem) {
  const claimedIds = new Set<number>();
  const normalizedRecords = records.map((savedItem) => {
    const record = cloneRecord(savedItem);
    const requestedId = positiveInteger(record.id);
    const id = requestedId && !claimedIds.has(requestedId) ? requestedId : null;

    if (id) {
      claimedIds.add(id);
    }

    return { id, record };
  });
  const usedIds = new Set<number>();
  let nextGeneratedId = 1;

  return normalizedRecords.map(({ id: savedId, record }) => {
    let id = savedId;
    if (!id) {
      while (claimedIds.has(nextGeneratedId) || usedIds.has(nextGeneratedId)) {
        nextGeneratedId += 1;
      }
      id = nextGeneratedId;
      nextGeneratedId += 1;
    }

    usedIds.add(id);
    return createItem(id, { ...record, id });
  });
}

function repeaterSourceItems(repeater: Repeater, savedItems: unknown) {
  if (Array.isArray(savedItems) && savedItems.length) {
    return savedItems;
  }

  if (Array.isArray(repeater.initialItems) && repeater.initialItems.length) {
    return repeater.initialItems;
  }

  const minimum = Math.max(0, Number(repeater.minimum) || 0);
  return Array.from({ length: minimum }, () => ({}));
}

function ensureMinimumRecords(items: RecordItem[], minimum: number | undefined, createItem: (id: number) => RecordItem, isActive: (item: RecordItem) => boolean = () => true) {
  const normalizedMinimum = Math.max(0, Number(minimum) || 0);
  let missing = normalizedMinimum - items.filter(isActive).length;
  let nextId = Math.max(0, ...items.map(({ id }) => positiveInteger(id) || 0)) + 1;

  while (missing > 0) {
    items.push(createItem(nextId));
    nextId += 1;
    missing -= 1;
  }

  return items;
}

function normalizeRepeaterItems(repeater: Repeater, savedItems: unknown) {
  const items = normalizeRecordCollection(
    repeaterSourceItems(repeater, savedItems),
    (id, item) => createRepeaterItem(repeater, id, item)
  );
  return ensureMinimumRecords(
    items,
    repeater.minimum,
    (id) => createRepeaterItem(repeater, id),
    (item) => !item._retired && !item.retired
  );
}

function applyStateDefaults(state: DataModel, defaults: DataModel | undefined) {
  for (const [key, defaultValue] of Object.entries(defaults || {})) {
    const currentValue = state[key];
    const defaultIsArray = Array.isArray(defaultValue);
    const defaultIsRecord = defaultValue && typeof defaultValue === "object" && !defaultIsArray;
    const currentMatchesContainer = defaultIsArray
      ? Array.isArray(currentValue)
      : defaultIsRecord
        ? currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
        : true;

    if (!Object.hasOwn(state, key) || !currentMatchesContainer) {
      state[key] = clone(defaultValue);
      continue;
    }

    if (
      currentValue && typeof currentValue === "object" && !Array.isArray(currentValue)
      && defaultValue && typeof defaultValue === "object" && !Array.isArray(defaultValue)
    ) {
      applyStateDefaults(currentValue as DataModel, defaultValue as DataModel);
    }
  }
}

export function createNestedItem(field: Field, id: number, savedItem: unknown = {}): RecordItem {
  const savedRecord = cloneRecord(savedItem);
  return (field.fields || []).reduce((item, nestedField) => {
    item[nestedField.key] = Object.hasOwn(savedRecord, nestedField.key)
      ? normalizeFieldValue(nestedField, savedRecord[nestedField.key])
      : createFieldDefault(nestedField);
    return item;
  }, { ...savedRecord, id: positiveInteger(savedRecord.id) || positiveInteger(id) || 1 });
}

export function createFieldDefault(field: Field) {
  if (field.type === "nested-records") {
    const minimum = Math.max(0, Number(field.minimum) || 0);
    return Array.from({ length: minimum }, (_, index) => createNestedItem(field, index + 1));
  }

  return clone(field.default);
}

export function normalizeFieldValue(field: Field, value: unknown) {
  if (field.type !== "nested-records") {
    return clone(value);
  }

  if (!Array.isArray(value)) {
    return createFieldDefault(field);
  }

  const records = normalizeRecordCollection(
    value,
    (id, record) => createNestedItem(field, id, record)
  );
  return ensureMinimumRecords(records, field.minimum, (id) => createNestedItem(field, id));
}

export function createRepeaterItem(repeater: Repeater, id: number, savedItem: unknown = {}): RecordItem {
  const savedRecord = cloneRecord(savedItem);
  return repeater.fields.reduce((item, field) => {
    item[field.key] = Object.hasOwn(savedRecord, field.key)
      ? normalizeFieldValue(field, savedRecord[field.key])
      : createFieldDefault(field);
    return item;
  }, { ...savedRecord, id: positiveInteger(savedRecord.id) || positiveInteger(id) || 1 });
}

export function createPageState(page: SchemaNode, savedState: unknown = {}): DataModel {
  // Preserve undeclared saved fields and subpages without transforming them.
  // Normalize declared values without making autosave destructive.
  const savedRecord = cloneRecord(savedState);
  const state: DataModel = clone(savedRecord);
  applyStateDefaults(state, page.stateDefaults);

  for (const section of page.sections || []) {
    if (section.dataPath) {
      continue;
    }

    if (section.repeatable) {
      const savedItems = savedRecord[section.repeatable.dataKey];
      state[section.repeatable.dataKey] = normalizeRepeaterItems(section.repeatable, savedItems);
      continue;
    }

    for (const field of section.fields || []) {
      state[field.key] = Object.hasOwn(savedRecord, field.key)
        ? normalizeFieldValue(field, savedRecord[field.key])
        : createFieldDefault(field);
    }
  }

  for (const subpage of page.subpages || []) {
    state[subpage.stateKey] = createPageState(subpage, savedRecord[subpage.stateKey] || {});
  }

  return state;
}

function normalizeExternalSections(page: SchemaNode, documentState: DocumentModel) {
  for (const section of page.sections || []) {
    if (!section.dataPath) {
      continue;
    }

    const target = ensureRecordAtPath(documentState, section.dataPath);
    if (!target) {
      continue;
    }

    if (section.repeatable) {
      const savedItems = target[section.repeatable.dataKey];
      target[section.repeatable.dataKey] = normalizeRepeaterItems(section.repeatable, savedItems);
      continue;
    }

    for (const field of section.fields || []) {
      target[field.key] = Object.hasOwn(target, field.key)
        ? normalizeFieldValue(field, target[field.key])
        : createFieldDefault(field);
    }
  }

  for (const subpage of page.subpages || []) {
    normalizeExternalSections(subpage, documentState);
  }
}

export function createDocumentState(pages: readonly SchemaNode[], savedSections: unknown = {}): DocumentModel {
  const savedRecord = cloneRecord(savedSections);
  const documentState = pages.reduce<DocumentModel>((state, page) => {
    state[page.stateKey] = createPageState(page, savedRecord[page.stateKey] || {});
    return state;
  }, savedRecord as DocumentModel);

  pages.forEach((page) => normalizeExternalSections(page, documentState));
  return documentState;
}
