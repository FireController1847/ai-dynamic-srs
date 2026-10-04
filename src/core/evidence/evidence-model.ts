import type {
  DataModel, Evidence, EvidenceGroup, Field,
  NavigationRequest, SchemaNode
} from '../schema/schema-types.ts';
import { asDataModel, recordItems, valueAtPath } from '../schema/data-models.ts';
import { fieldVisible } from '../schema/field-visibility.ts';
import { sectionRecords } from '../schema/section-records.ts';
import { formatRecordDisplayId, hasNonDefaultValue, hasValue } from '../records/record-values.ts';
import { referenceChoices } from '../records/reference-fields.ts';
import { diagramFileSummary } from '../artifacts/diagram-files.ts';
import { narrativeMarkdown } from '../formatting/markdown.ts';

export interface EvidenceValue {
  key: string;
  label: string;
  text: string;
  markdown: boolean;
}
export interface EvidenceRecord {
  id: string;
  label: string;
  values: EvidenceValue[];
}
export interface EvidenceSection {
  id: string;
  title: string;
  repeatable: boolean;
  values: EvidenceValue[];
  records: EvidenceRecord[];
  target: NavigationRequest;
}
export interface ConnectedSource {
  id: string;
  schema: SchemaNode;
  reason: string;
  groups: EvidenceSection[];
}
interface SourceLocation {
  schema: SchemaNode;
  path: string[];
  selections: Record<string, string>;
}

// The active schema tree owns state paths and navigation, including moved stages.
function locateSource(root: SchemaNode, nodeId = root.id): SourceLocation | undefined {
  function visit(node: SchemaNode, path: string[], selections: Record<string, string>): SourceLocation | undefined {
    if (node.id === nodeId) return { schema: node, path, selections };
    for (const child of node.subpages || []) {
      const found = visit(child, [...path, child.stateKey], { ...selections, [node.id]: child.id });
      if (found) return found;
    }
    return undefined;
  }
  return visit(root, [root.stateKey], {});
}

function optionText(field: Field, value: unknown, documentModel: DataModel): string {
  if (field.reference) {
    const choices = referenceChoices(field.reference, documentModel);
    return String(value).split(/[,;]\s*/).filter(Boolean)
      .map(id => choices.find(choice => choice.value === id)?.label || id).join('; ');
  }
  const option = field.options?.find(candidate => (
    typeof candidate === 'object' ? candidate.value : candidate
  ) === value);
  return String(option === undefined ? value : typeof option === 'object' ? option.label : option);
}

function fieldHasContent(field: Field, data: DataModel): boolean {
  if (field.includeInPrompt === false || (!field.preserveWhenHidden && !fieldVisible(field, data))) return false;
  if (field.type === 'nested-records') {
    return recordItems(data[field.key]).some(record => (field.fields || []).some(child => fieldHasContent(child, record)));
  }
  return hasNonDefaultValue(data[field.key], field.default);
}

function valueText(field: Field, value: unknown, documentModel: DataModel): string {
  if (field.type === 'diagram-file') return diagramFileSummary(value);
  if (field.type === 'nested-records') {
    return recordItems(value).filter(record => (field.fields || []).some(child => fieldHasContent(child, record))).map((record, index) => {
      const children = valuesFor(field.fields || [], record, documentModel);
      return children.length
        ? `${field.itemLabel || 'Item'} ${index + 1}\n${children.map(child => `${child.label}: ${child.text}`).join('\n')}`
        : '';
    }).filter(Boolean).join('\n\n');
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => field.type === 'period-values'
      ? `Year ${index + 1}: ${String(item ?? '')}`
      : optionText(field, item, documentModel)).join(field.type === 'period-values' ? '\n' : ', ');
  }
  return optionText(field, value, documentModel).trim();
}

function valuesFor(fields: readonly Field[], data: DataModel, documentModel: DataModel): EvidenceValue[] {
  return fields.filter(field => field.includeInPrompt !== false && hasValue(data[field.key])
    && (field.preserveWhenHidden || fieldVisible(field, data)))
    .map(field => ({
      key: field.key,
      label: field.label,
      text: valueText(field, data[field.key], documentModel),
      markdown: narrativeMarkdown(field)
    })).filter(value => value.text.length > 0);
}

function resolveGroup(
  definition: EvidenceGroup, root: SchemaNode, location: SourceLocation,
  data: DataModel, documentModel: DataModel
): EvidenceSection | undefined {
  const section = location.schema.sections?.find(candidate => candidate.id === definition.sectionId);
  if (!section) return undefined;
  const selectedKeys = section.repeatable ? definition.recordFieldKeys : definition.fieldKeys;
  const fields = (section.repeatable?.fields || section.fields || [])
    .filter(field => field.includeInPrompt !== false && (!selectedKeys || selectedKeys.includes(field.key)));
  if (!fields.length) return undefined;
  // Resolve shared sections without creating containers or changing saved state.
  const model = section.dataPath ? asDataModel(valueAtPath(documentModel, section.dataPath)) : data;
  const result: EvidenceSection = {
    id: section.id,
    title: definition.title || section.title,
    repeatable: Boolean(section.repeatable),
    values: [],
    records: [],
    target: {
      pageId: root.id,
      subpageSelections: location.selections,
      anchorId: `${location.schema.id}-${section.id}`
    }
  };
  if (section.repeatable) {
    const repeater = section.repeatable;
    const primaryField = fields.find(field => field.key === repeater.primaryField);
    result.records = sectionRecords(repeater, model).filter(record => fields.some(field => fieldHasContent(field, record))).map((record, index) => ({
      id: formatRecordDisplayId(repeater.displayId, record, index),
      label: primaryField && !narrativeMarkdown(primaryField) && hasValue(record[primaryField.key]) ? String(record[primaryField.key]) : '',
      values: valuesFor(fields, record, documentModel)
    })).filter(record => record.values.length > 0);
  } else if (fields.some(field => fieldHasContent(field, model))) {
    result.values = valuesFor(fields, model, documentModel);
  }
  return result;
}

function mergeValues(current: EvidenceValue[], incoming: EvidenceValue[]): EvidenceValue[] {
  return [...new Map([...current, ...incoming].map(value => [value.key, value])).values()];
}

function mergeGroup(current: EvidenceSection, incoming: EvidenceSection): void {
  current.values = mergeValues(current.values, incoming.values);
  for (const record of incoming.records) {
    const existing = current.records.find(candidate => candidate.id === record.id);
    if (existing) existing.values = mergeValues(existing.values, record.values);
    else current.records.push(record);
  }
}

export function connectedEvidence(
  evidence: Evidence | undefined, documentModel: DataModel, documentSchemas: readonly SchemaNode[]
): ConnectedSource[] {
  const sources = new Map<string, ConnectedSource>();
  for (const definition of evidence?.sources || []) {
    const root = documentSchemas.find(page => page.id === definition.pageId);
    if (!root) continue;
    const location = locateSource(root, definition.nodeId);
    if (!location) continue;
    const data = asDataModel(valueAtPath(documentModel,
      definition.nodeId ? location.path : definition.dataPath || location.path));
    const groups = (definition.groups || []).map(group => resolveGroup(group, root, location, data, documentModel))
      .filter((group): group is EvidenceSection => group !== undefined);
    if (!groups.length) continue;
    const id = `${root.id}:${location.schema.id}`;
    let source = sources.get(id);
    if (!source) {
      source = { id, schema: location.schema, reason: definition.reason || '', groups: [] };
      sources.set(id, source);
    } else if (definition.reason && !source.reason.includes(definition.reason)) {
      source.reason = [source.reason, definition.reason].filter(Boolean).join(' ');
    }
    for (const group of groups) {
      const existing = source.groups.find(candidate => candidate.id === group.id);
      if (existing) mergeGroup(existing, group);
      else source.groups.push(group);
    }
  }
  return [...sources.values()];
}

export function evidenceSectionHasContent(group: EvidenceSection): boolean {
  return group.values.length > 0 || group.records.length > 0;
}
