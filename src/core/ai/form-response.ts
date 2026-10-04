import type { DataModel, Field, SchemaNode, Section } from '../schema/schema-types.ts';
import { referenceChoices } from '../records/reference-fields.ts';
import { parentRecordGroups } from '../records/parent-records.ts';
import { sectionPromptFields } from './prompt-schema.ts';

export const AI_FORM_RESPONSE_FORMAT = 'dsrs-form' as const;
export const AI_FORM_RESPONSE_VERSION = 1 as const;

export type AiFormRecordId = string | number;

export interface AiFormNeed {
  path: string;
  reason: string;
}

export interface AiFormRecordResponse {
  id?: AiFormRecordId | null;
  parent?: AiFormRecordId | null;
  fields: DataModel;
}

export interface AiFormResponse {
  format: typeof AI_FORM_RESPONSE_FORMAT;
  version: typeof AI_FORM_RESPONSE_VERSION;
  page: string;
  section: string;
  mode: 'merge';
  record?: AiFormRecordId;
  path?: AiFormRecordId[];
  fields?: DataModel;
  records?: AiFormRecordResponse[];
  needsInformation?: AiFormNeed[];
}

export interface AiFormResponseContract {
  envelope: DataModel;
  fieldTypes: string[];
}

function isObject(value: unknown): value is DataModel {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function responseError(message: string): never {
  throw new Error(`Invalid dsrs-form response: ${message}`);
}

function onlyKeys(value: DataModel, allowed: readonly string[], path: string) {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter(key => !allowedKeys.has(key));
  if (unknown.length) responseError(`${path} contains unsupported key(s): ${unknown.join(', ')}.`);
}

function recordId(value: unknown, path: string): AiFormRecordId;
function recordId(value: unknown, path: string, nullable: true): AiFormRecordId | null;
function recordId(value: unknown, path: string, nullable = false): AiFormRecordId | null {
  if (nullable && value === null) return null;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim()) return value.trim();
  return responseError(`${path} must be a non-empty string or positive integer${nullable ? ', or null' : ''}.`);
}

function parseRecord(value: unknown, index: number): AiFormRecordResponse {
  if (!isObject(value)) responseError(`records[${index}] must be an object.`);
  onlyKeys(value, ['id', 'parent', 'fields'], `records[${index}]`);
  if (!isObject(value.fields)) responseError(`records[${index}].fields must be an object.`);
  return {
    ...(Object.hasOwn(value, 'id') ? { id: recordId(value.id, `records[${index}].id`, true) } : {}),
    ...(Object.hasOwn(value, 'parent') ? { parent: recordId(value.parent, `records[${index}].parent`, true) } : {}),
    fields: value.fields
  };
}

function parseNeeds(value: unknown): AiFormNeed[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) responseError('needsInformation must be an array.');
  return value.map((item, index) => {
    if (!isObject(item)) responseError(`needsInformation[${index}] must be an object.`);
    onlyKeys(item, ['path', 'reason'], `needsInformation[${index}]`);
    if (typeof item.path !== 'string' || !item.path.trim()) responseError(`needsInformation[${index}].path must be a non-empty string.`);
    if (typeof item.reason !== 'string' || !item.reason.trim()) responseError(`needsInformation[${index}].reason must be a non-empty string.`);
    return { path: item.path.trim(), reason: item.reason.trim() };
  });
}

function unfenceJson(text: string) {
  const trimmed = text.trim();
  const fenced = /^\`\`\`(?:json|dsrs-form)?\s*([\s\S]*?)\s*\`\`\`$/i.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

export function parseAiFormResponse(input: string | unknown): AiFormResponse {
  let value = input;
  if (typeof input === 'string') {
    try {
      value = JSON.parse(unfenceJson(input));
    } catch {
      return responseError('the pasted content is not valid JSON.');
    }
  }

  if (!isObject(value)) responseError('the response root must be an object.');
  onlyKeys(value, ['format', 'version', 'page', 'section', 'mode', 'record', 'path', 'fields', 'records', 'needsInformation'], 'response');

  if (value.format !== AI_FORM_RESPONSE_FORMAT) responseError(`format must be "${AI_FORM_RESPONSE_FORMAT}".`);
  if (value.version !== AI_FORM_RESPONSE_VERSION) responseError(`version must be ${AI_FORM_RESPONSE_VERSION}.`);
  if (typeof value.page !== 'string' || !value.page.trim()) responseError('page must be a non-empty schema page ID.');
  if (typeof value.section !== 'string' || !value.section.trim()) responseError('section must be a non-empty schema section ID.');
  if (value.mode !== 'merge') responseError('mode must be "merge" in version 1.');

  const hasFields = Object.hasOwn(value, 'fields');
  const hasRecords = Object.hasOwn(value, 'records');
  if (hasFields === hasRecords) responseError('provide exactly one of fields or records.');
  if (hasFields && !isObject(value.fields)) responseError('fields must be an object.');
  if (hasRecords && !Array.isArray(value.records)) responseError('records must be an array.');
  if (hasRecords && (Object.hasOwn(value, 'record') || Object.hasOwn(value, 'path'))) {
    responseError('record/path targeting cannot be combined with a records collection.');
  }

  const record = Object.hasOwn(value, 'record') ? recordId(value.record, 'record') : undefined;
  let path: AiFormRecordId[] | undefined;
  if (Object.hasOwn(value, 'path')) {
    if (!Array.isArray(value.path) || value.path.length === 0 || value.path.length % 2 !== 0) {
      responseError('path must contain nested field/id pairs.');
    }
    path = value.path.map((part, index) => index % 2 === 0
      ? (typeof part === 'string' && part.trim() ? part.trim() : responseError(`path[${index}] must be a nested field key.`))
      : recordId(part, `path[${index}]`));
  }

  const records = hasRecords ? (value.records as unknown[]).map(parseRecord) : undefined;
  if (records) {
    const existingIds = records.flatMap(item => item.id === undefined || item.id === null ? [] : [String(item.id)]);
    if (new Set(existingIds).size !== existingIds.length) responseError('records contains a duplicate existing record ID.');
  }

  const needsInformation = parseNeeds(value.needsInformation);

  return {
    format: AI_FORM_RESPONSE_FORMAT,
    version: AI_FORM_RESPONSE_VERSION,
    page: value.page.trim(),
    section: value.section.trim(),
    mode: 'merge',
    ...(record !== undefined ? { record } : {}),
    ...(path ? { path } : {}),
    ...(hasFields ? { fields: value.fields as DataModel } : {}),
    ...(records ? { records } : {}),
    ...(needsInformation ? { needsInformation } : {})
  };
}

function optionValue(option: NonNullable<Field['options']>[number]) {
  return typeof option === 'object' ? option.value : option;
}

function editableFields(fields: readonly Field[]) {
  return fields.filter(field => field.includeInPrompt !== false && field.editable !== false && !field.hidden && field.type !== 'diagram-file');
}

function placeholder(field: Field): unknown {
  if (field.type === 'nested-records') {
    return [{ fields: Object.fromEntries(editableFields(field.fields || []).map(child => [child.key, placeholder(child)])) }];
  }
  if (field.type === 'checkbox-group' || field.type === 'period-values') return [];
  return null;
}

function allowedReferences(field: Field, documentModel: DataModel) {
  const references = field.reference ? [field.reference] : field.references || [];
  return [...new Set(references.flatMap(reference => referenceChoices(reference, documentModel).map(choice => choice.value)))];
}

function typeDescription(field: Field, documentModel: DataModel, prefix = ''): string[] {
  const path = prefix ? `${prefix}.${field.key}` : field.key;
  if (field.type === 'nested-records') {
    return [
      `${path}=nested records (existing id or omitted id for new)`,
      ...editableFields(field.fields || []).flatMap(child => typeDescription(child, documentModel, path))
    ];
  }

  const references = allowedReferences(field, documentModel);
  if (references.length) {
    return [`${path}=${field.type === 'record-links' ? 'IDs[] or comma-separated IDs' : 'ID'} {${references.join('|')}}`];
  }

  if (field.type === 'select') {
    const values = (field.options || []).map(optionValue).map(value => JSON.stringify(value));
    return [`${path}=${values.length ? values.join('|') : 'string'}`];
  }
  if (field.type === 'checkbox-group') {
    const values = (field.options || []).map(optionValue).map(value => JSON.stringify(value));
    return [`${path}=[${values.join('|')}]`];
  }
  if (field.type === 'number') return [`${path}=number`];
  if (field.type === 'date') return [`${path}=YYYY-MM-DD`];
  if (field.type === 'period-values') return [`${path}=number[]`];
  if (field.type === 'url') return [`${path}=URL string`];
  return [`${path}=string`];
}

export function buildAiFormResponseContract(
  page: Pick<SchemaNode, 'id'>,
  section: Section,
  documentModel: DataModel
): AiFormResponseContract {
  const fields = editableFields(sectionPromptFields(section));
  const fieldTemplate = Object.fromEntries(fields.map(field => [field.key, placeholder(field)]));
  const base = {
    format: AI_FORM_RESPONSE_FORMAT,
    version: AI_FORM_RESPONSE_VERSION,
    page: page.id,
    section: section.id,
    mode: 'merge'
  };
  const parent = section.repeatable?.parent && !section.repeatable.parent.preserveFreeform
    ? parentRecordGroups(section.repeatable, {}, documentModel).parents.map(choice => choice.value)
    : [];

  const envelope: DataModel = section.repeatable
    ? {
      ...base,
      records: [{
        id: null,
        ...(parent.length ? { parent: null } : {}),
        fields: fieldTemplate
      }],
      needsInformation: []
    }
    : { ...base, fields: fieldTemplate, needsInformation: [] };

  const fieldTypes = fields.flatMap(field => typeDescription(field, documentModel));
  if (parent.length) fieldTypes.unshift(`records[].parent={${parent.join('|')}} for new records`);

  return { envelope, fieldTypes };
}

export function renderAiFormResponseContract(
  page: Pick<SchemaNode, 'id'>,
  section: Section,
  documentModel: DataModel
) {
  const contract = buildAiFormResponseContract(page, section, documentModel);
  return [
    'Return only one valid dsrs-form v1 JSON object. mode is merge. null means unsupported/no change; omitted fields also remain unchanged.',
    'Use existing record IDs exactly; omit id for a new record. Never return read-only/app-managed fields or diagram payloads.',
    `Shape: ${JSON.stringify(contract.envelope)}`,
    contract.fieldTypes.length ? `Types: ${contract.fieldTypes.join('; ')}` : ''
  ].filter(Boolean).join('\n');
}
