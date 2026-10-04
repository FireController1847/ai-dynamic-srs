import type { DataModel, Field, Repeater, SchemaNode, Section } from '../schema/schema-types.ts';
import { dataModelForSection, recordItems } from '../schema/data-models.ts';
import { fieldVisible } from '../schema/field-visibility.ts';
import { createNestedItem, createRepeaterItem } from '../schema/state-factory.ts';
import { sectionRecords } from '../schema/section-records.ts';
import { nextRepeaterRecordId } from '../records/record-lifecycle.ts';
import { formatRecordDisplayId, nextNumericId } from '../records/record-values.ts';
import { parentRecordGroups } from '../records/parent-records.ts';
import { referenceChoices } from '../records/reference-fields.ts';
import { promptPeriodCount, sectionPromptFields } from './prompt-schema.ts';
import { parseAiFormResponse } from './form-response.ts';
import type { AiFormNeed, AiFormRecordId, AiFormRecordResponse, AiFormResponse } from './form-response.ts';

interface ReplacePatch {
  kind: 'replace';
  field: Field;
  value: unknown;
}

interface PeriodPatch {
  kind: 'period';
  field: Field;
  values: Array<number | undefined>;
}

interface NestedRecordPatch {
  id?: number;
  isNew: boolean;
  fields: FieldPatch[];
}

interface NestedPatch {
  kind: 'nested';
  field: Field;
  records: NestedRecordPatch[];
}

type FieldPatch = ReplacePatch | PeriodPatch | NestedPatch;

interface RecordPatch {
  existing?: DataModel;
  response: AiFormRecordResponse;
  parentValue?: string;
  fields: FieldPatch[];
}

export interface AiFormImportExpectation {
  record?: AiFormRecordId;
  path?: readonly AiFormRecordId[];
  fieldKeys?: readonly string[];
}

export interface AiFormImportResult {
  updatedFields: number;
  updatedRecords: number;
  addedRecords: number;
  addedNestedRecords: number;
  skippedNulls: number;
  needsInformation: AiFormNeed[];
}

interface PlanningStats {
  skippedNulls: number;
}

function importError(message: string): never {
  throw new Error(`Cannot import dsrs-form response: ${message}`);
}

function sameId(left: AiFormRecordId | undefined, right: AiFormRecordId | undefined) {
  return left !== undefined && right !== undefined && String(left) === String(right);
}

function responseRecordId(section: Section, record: DataModel, index: number): AiFormRecordId {
  if (section.repeatable?.displayId) return formatRecordDisplayId(section.repeatable.displayId, record, index);
  const id = Number(record.id);
  return Number.isSafeInteger(id) && id > 0 ? id : String(record.id);
}

function findSectionRecord(section: Section, model: DataModel, id: AiFormRecordId) {
  if (!section.repeatable) return undefined;
  const records = sectionRecords(section.repeatable, model);
  return records.find((record, index) => sameId(id, responseRecordId(section, record, index))
    || sameId(id, typeof record.id === 'number' || typeof record.id === 'string' ? record.id : undefined));
}

function nestedId(value: unknown, path: string) {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number <= 0) importError(`${path} must be a positive nested record ID.`);
  return number;
}

function optionValue(option: NonNullable<Field['options']>[number]) {
  return typeof option === 'object' ? option.value : option;
}

function optionLabel(option: NonNullable<Field['options']>[number]) {
  return typeof option === 'object' ? option.label : String(option);
}

function sameValue(left: unknown, right: unknown) {
  return Object.is(left, right) || (
    (typeof left === 'string' || typeof left === 'number' || typeof left === 'boolean')
    && (typeof right === 'string' || typeof right === 'number' || typeof right === 'boolean')
    && String(left) === String(right)
  );
}

function referenceOptions(field: Field, documentModel: DataModel) {
  const references = field.reference ? [field.reference] : field.references || [];
  return [...new Map(
    references
      .flatMap(reference => referenceChoices(reference, documentModel))
      .map(choice => [choice.value, choice])
  ).values()];
}

function normalizeChoice(field: Field, value: unknown, path: string) {
  const option = (field.options || []).find(candidate => sameValue(optionValue(candidate), value)
    || (typeof value === 'string' && optionLabel(candidate) === value));
  if (!option) importError(`${path} must use one of the declared option values.`);
  return optionValue(option);
}

function normalizeReference(field: Field, value: unknown, documentModel: DataModel, path: string) {
  const choices = referenceOptions(field, documentModel);
  const match = (candidate: unknown) => choices.find(choice => sameValue(choice.value, candidate)
    || (typeof candidate === 'string' && choice.label === candidate));

  if (field.type === 'record-links') {
    const supplied = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[,;]\s*/).filter(Boolean)
        : importError(`${path} must be an array of IDs or a comma-separated ID string.`);
    const ids = supplied.map((candidate, index) => {
      const choice = match(candidate);
      if (!choice) importError(`${path}[${index}] is not an available record reference.`);
      return choice.value;
    });
    return [...new Set(ids)].join(', ');
  }

  const choice = match(value);
  if (!choice) importError(`${path} is not an available record reference.`);
  return choice.value;
}

function normalizeNumber(field: Field, value: unknown, path: string) {
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number)) importError(`${path} must be numeric.`);
  if (field.min !== undefined && number < field.min) importError(`${path} is below the minimum ${field.min}.`);
  if (field.max !== undefined && number > field.max) importError(`${path} is above the maximum ${field.max}.`);
  return number;
}

function normalizeSimple(field: Field, value: unknown, documentModel: DataModel, path: string): unknown {
  const references = field.reference || field.references?.length;
  if (references) return normalizeReference(field, value, documentModel, path);

  if (field.type === 'select') return normalizeChoice(field, value, path);
  if (field.type === 'checkbox-group') {
    if (!Array.isArray(value)) importError(`${path} must be an array.`);
    return [...new Set(value.map((item, index) => normalizeChoice(field, item, `${path}[${index}]`)))];
  }
  if (field.type === 'number') return normalizeNumber(field, value, path);
  if (field.type === 'date') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) importError(`${path} must use YYYY-MM-DD.`);
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) importError(`${path} is not a valid calendar date.`);
    return value;
  }
  if (field.type === 'url') {
    if (typeof value !== 'string') importError(`${path} must be a URL string.`);
    return value;
  }
  if (field.type === 'text' || field.type === 'textarea' || !field.type) {
    if (typeof value !== 'string') importError(`${path} must be a string.`);
    return value;
  }

  return importError(`${path} uses unsupported field type "${field.type}".`);
}

function ensureEditable(field: Field, path: string) {
  if (field.includeInPrompt === false) importError(`${path} is excluded from AI form responses.`);
  if (field.editable === false || field.hidden) importError(`${path} is app-managed/read-only and cannot be imported.`);
  if (field.type === 'diagram-file') importError(`${path} is a diagram; use the dsrs-diagram import path instead.`);
}

function nestedRecordInput(value: unknown, path: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) importError(`${path} must be an object.`);
  const model = value as DataModel;
  const unknown = Object.keys(model).filter(key => key !== 'id' && key !== 'fields');
  if (unknown.length) importError(`${path} contains unsupported key(s): ${unknown.join(', ')}.`);
  if (!model.fields || typeof model.fields !== 'object' || Array.isArray(model.fields)) importError(`${path}.fields must be an object.`);
  return model;
}

function planHasChanges(patches: readonly FieldPatch[]): boolean {
  return patches.some(patch => patch.kind === 'replace'
    || (patch.kind === 'period' && patch.values.some(value => value !== undefined))
    || (patch.kind === 'nested' && patch.records.some(record => record.isNew || planHasChanges(record.fields))));
}

function normalizeNested(
  field: Field,
  value: unknown,
  current: unknown,
  documentModel: DataModel,
  periodCount: number,
  path: string,
  stats: PlanningStats
): NestedPatch {
  if (!Array.isArray(value)) importError(`${path} must be an array of nested record objects.`);
  const existing = recordItems(current).filter(record => !record._retired && !record.retired);
  const used = new Set<number>();
  const records = value.map((raw, index): NestedRecordPatch => {
    const item = nestedRecordInput(raw, `${path}[${index}]`);
    const hasId = Object.hasOwn(item, 'id') && item.id !== null;
    const id = hasId ? nestedId(item.id, `${path}[${index}].id`) : undefined;
    if (id !== undefined && used.has(id)) importError(`${path} contains duplicate nested record ID ${id}.`);
    if (id !== undefined) used.add(id);
    const currentItem = id === undefined ? undefined : existing.find(record => Number(record.id) === id);
    if (id !== undefined && !currentItem) importError(`${path} references unavailable nested record ID ${id}.`);
    const base = currentItem || createNestedItem(field, 1);
    const fields = normalizeFields(field.fields || [], base, item.fields as DataModel, documentModel, periodCount, `${path}[${index}].fields`, stats);
    if (!currentItem && !planHasChanges(fields)) importError(`${path}[${index}] would add an empty nested record.`);
    return { ...(id !== undefined ? { id } : {}), isNew: !currentItem, fields };
  });
  return { kind: 'nested', field, records };
}

function normalizePeriod(field: Field, value: unknown, current: unknown, periodCount: number, path: string, stats: PlanningStats): PeriodPatch {
  if (!Array.isArray(value)) importError(`${path} must be an array of yearly values.`);
  if (value.length > periodCount) importError(`${path} has ${value.length} values but the active analysis has ${periodCount} periods.`);
  const values = value.map((item, index) => {
    if (item === null) {
      stats.skippedNulls += 1;
      return undefined;
    }
    return normalizeNumber(field, item, `${path}[${index}]`);
  });
  void current;
  return { kind: 'period', field, values };
}

function normalizeFields(
  fields: readonly Field[],
  current: DataModel,
  incoming: DataModel,
  documentModel: DataModel,
  periodCount: number,
  path: string,
  stats: PlanningStats
): FieldPatch[] {
  const byKey = new Map(fields.map(field => [field.key, field]));
  for (const key of Object.keys(incoming)) {
    const field = byKey.get(key);
    if (!field) importError(`${path}.${key} is not a declared field in this scope.`);
    ensureEditable(field, `${path}.${key}`);
  }

  const candidate: DataModel = { ...current };
  const simpleValues = new Map<string, unknown>();
  for (const [key, value] of Object.entries(incoming)) {
    if (value === null) continue;
    const field = byKey.get(key) as Field;
    if (field.type === 'nested-records' || field.type === 'period-values') continue;
    const normalized = normalizeSimple(field, value, documentModel, `${path}.${key}`);
    simpleValues.set(key, normalized);
    candidate[key] = normalized;
  }

  const patches: FieldPatch[] = [];
  for (const [key, value] of Object.entries(incoming)) {
    const field = byKey.get(key) as Field;
    if (value === null) {
      stats.skippedNulls += 1;
      continue;
    }
    if (!fieldVisible(field, candidate)) importError(`${path}.${key} is inactive under the supplied conditional values.`);

    if (field.type === 'nested-records') {
      patches.push(normalizeNested(field, value, current[key], documentModel, periodCount, `${path}.${key}`, stats));
    } else if (field.type === 'period-values') {
      patches.push(normalizePeriod(field, value, current[key], periodCount, `${path}.${key}`, stats));
    } else {
      patches.push({ kind: 'replace', field, value: simpleValues.get(key) });
    }
  }
  return patches;
}

function resolveNestedTarget(
  fields: readonly Field[],
  root: DataModel,
  path: readonly AiFormRecordId[]
): { fields: Field[]; model: DataModel } {
  let currentFields = [...fields];
  let model = root;
  for (let index = 0; index < path.length; index += 2) {
    const key = path[index];
    if (typeof key !== 'string') importError(`path[${index}] must be a nested field key.`);
    const field = currentFields.find(candidate => candidate.key === key);
    if (!field || field.type !== 'nested-records') importError(`path field "${key}" is not a nested record collection.`);
    ensureEditable(field, `path.${key}`);
    const id = nestedId(path[index + 1], `path[${index + 1}]`);
    const item = recordItems(model[key]).find(record => !record._retired && !record.retired && Number(record.id) === id);
    if (!item) importError(`path references unavailable nested record ID ${id} in "${key}".`);
    model = item;
    currentFields = field.fields || [];
  }
  return { fields: currentFields, model };
}

function normalizeParent(repeater: Repeater, response: AiFormRecordResponse, documentModel: DataModel, path: string) {
  const parent = repeater.parent;
  if (!parent || parent.preserveFreeform) {
    if (Object.hasOwn(response, 'parent')) importError(`${path}.parent is not valid for this collection.`);
    return undefined;
  }

  if (response.parent === undefined || response.parent === null) {
    if (!parent.allowUngrouped) importError(`${path}.parent is required for a new grouped record.`);
    return undefined;
  }

  const { parents } = parentRecordGroups(repeater, {}, documentModel);
  const match = parents.find(choice => sameId(response.parent ?? undefined, choice.value) || choice.label === response.parent);
  if (!match) importError(`${path}.parent is not an available parent record.`);
  return match.value;
}

function applyFields(model: DataModel, patches: readonly FieldPatch[], result: AiFormImportResult): number {
  let changed = 0;
  for (const patch of patches) {
    if (patch.kind === 'replace') {
      model[patch.field.key] = patch.value;
      result.updatedFields += 1;
      changed += 1;
      continue;
    }

    if (patch.kind === 'period') {
      const values = Array.isArray(model[patch.field.key]) ? [...model[patch.field.key] as unknown[]] : [];
      let periodChanged = false;
      patch.values.forEach((value, index) => {
        if (value === undefined) return;
        values[index] = value;
        periodChanged = true;
      });
      if (periodChanged) {
        model[patch.field.key] = values;
        result.updatedFields += 1;
        changed += 1;
      }
      continue;
    }

    const records = Array.isArray(model[patch.field.key]) ? model[patch.field.key] as DataModel[] : [];
    if (!Array.isArray(model[patch.field.key])) model[patch.field.key] = records;
    for (const nested of patch.records) {
      let target = nested.id === undefined ? undefined : records.find(record => Number(record.id) === nested.id);
      if (nested.isNew) {
        const id = nextNumericId(records);
        target = createNestedItem(patch.field, id);
        records.push(target);
        result.addedNestedRecords += 1;
        changed += 1;
      }
      if (!target) importError(`nested record ${nested.id} disappeared before import could be applied.`);
      changed += applyFields(target, nested.fields, result);
    }
  }
  return changed;
}

function verifyExpectation(response: AiFormResponse, expectation: AiFormImportExpectation | undefined) {
  if (!expectation) return;
  if (expectation.record !== undefined && !sameId(response.record, expectation.record)) {
    importError('the response record target does not match the form control that requested it.');
  }
  if (expectation.record === undefined && response.record !== undefined) {
    importError('the response targets a record but the requesting control did not.');
  }

  const expectedPath = expectation.path || [];
  const actualPath = response.path || [];
  if (expectedPath.length !== actualPath.length || expectedPath.some((part, index) => !sameId(part, actualPath[index]))) {
    importError('the response nested target does not match the form control that requested it.');
  }

  if (expectation.fieldKeys && response.fields) {
    const allowed = new Set(expectation.fieldKeys);
    const unexpected = Object.keys(response.fields).filter(key => !allowed.has(key));
    if (unexpected.length) importError(`the response includes fields outside the requested scope: ${unexpected.join(', ')}.`);
  }
}

export function applyAiFormResponse(args: {
  page: SchemaNode;
  section: Section;
  dataModel: DataModel;
  documentModel?: DataModel;
  response: string | unknown;
  expectation?: AiFormImportExpectation;
}): AiFormImportResult {
  const { page, section, dataModel, expectation } = args;
  const documentModel = args.documentModel || dataModel;
  const response = parseAiFormResponse(args.response);
  if (response.page !== page.id) importError(`response page "${response.page}" does not match "${page.id}".`);
  if (response.section !== section.id) importError(`response section "${response.section}" does not match "${section.id}".`);
  verifyExpectation(response, expectation);

  const model = dataModelForSection(section, dataModel, documentModel);
  const fields = sectionPromptFields(section);
  const periods = promptPeriodCount(page, dataModel);
  const planning: PlanningStats = { skippedNulls: 0 };
  const result: AiFormImportResult = {
    updatedFields: 0,
    updatedRecords: 0,
    addedRecords: 0,
    addedNestedRecords: 0,
    skippedNulls: 0,
    needsInformation: response.needsInformation || []
  };

  if (response.records) {
    const repeater = section.repeatable;
    if (!repeater) importError('records can only be imported into a repeatable section.');
    const plans = response.records.map((item, index): RecordPatch => {
      const existing = item.id === undefined || item.id === null ? undefined : findSectionRecord(section, model, item.id);
      if (item.id !== undefined && item.id !== null && !existing) importError(`records[${index}] targets an unavailable record ID.`);
      if (existing && Object.hasOwn(item, 'parent')) importError(`records[${index}].parent is only allowed for new records in version 1.`);
      if (!existing && repeater.allowAdd === false) importError(`records[${index}] cannot add to this carried/read-only collection.`);
      const base = existing || createRepeaterItem(repeater, 1);
      const parentValue = existing ? undefined : normalizeParent(repeater, item, documentModel, `records[${index}]`);
      const fieldPatches = normalizeFields(fields, base, item.fields, documentModel, periods, `records[${index}].fields`, planning);
      if (!existing && !planHasChanges(fieldPatches)) importError(`records[${index}] would add an empty record.`);
      return { ...(existing ? { existing } : {}), response: item, ...(parentValue ? { parentValue } : {}), fields: fieldPatches };
    });

    const canonical = Array.isArray(model[repeater.dataKey]) ? model[repeater.dataKey] as DataModel[] : [];
    if (!Array.isArray(model[repeater.dataKey])) model[repeater.dataKey] = canonical;
    for (const plan of plans) {
      let target = plan.existing;
      if (!target) {
        const id = nextRepeaterRecordId(repeater, canonical, documentModel);
        target = createRepeaterItem(repeater, id);
        if (plan.parentValue && repeater.parent) target[repeater.parent.fieldKey] = plan.parentValue;
        canonical.push(target);
        result.addedRecords += 1;
      }
      const changed = applyFields(target, plan.fields, result);
      if (plan.existing && changed) result.updatedRecords += 1;
    }
  } else {
    if (!response.fields) importError('fields are required for this response.');
    let target = model;
    let targetFields = fields;

    if (section.repeatable) {
      if (response.record === undefined) importError('a repeatable section field response must name its existing record target.');
      const record = findSectionRecord(section, model, response.record);
      if (!record) importError('the targeted record is unavailable in this section.');
      target = record;
    } else if (response.record !== undefined) {
      importError('record targeting is not valid for this non-repeatable section.');
    }

    if (response.path?.length) {
      const nested = resolveNestedTarget(targetFields, target, response.path);
      targetFields = nested.fields;
      target = nested.model;
    }

    const patches = normalizeFields(targetFields, target, response.fields, documentModel, periods, 'fields', planning);
    const changed = applyFields(target, patches, result);
    if (section.repeatable && changed) result.updatedRecords += 1;
  }

  result.skippedNulls = planning.skippedNulls;
  return result;
}
