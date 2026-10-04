import type { DataModel } from '../schema/schema-types.ts';
import type { DiagramConfig, DiagramContext } from './diagram-graph.ts';
import { recordItems, valueAtPath } from '../schema/data-models.ts';
import { fieldVisible } from '../schema/field-visibility.ts';
import { formatRecordDisplayId } from '../records/record-values.ts';

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value).trim() : '';
}
function ids(value: unknown): string[] { return text(value).split(/[\s,;]+/).filter(Boolean); }

/** Schema-selected scalar evidence only: no saved artifact objects or file metadata. */
export function diagramContext(config: DiagramConfig | undefined, document: DataModel, records: readonly DataModel[] = []): DiagramContext {
  const labels = new Map<string, string>();
  const prefixes: string[] = [];
  const selected = new Map<string, { id: string; record: DataModel }[]>();
  const evidence: DataModel = {};
  labels.set('@system', 'System');
  for (const alias of config?.labels || []) {
    const label = alias.paths.map(path => text(valueAtPath(document, path))).find(Boolean) || alias.fallback;
    labels.set(alias.id, label);
  }
  if (labels.size) evidence.labels = Object.fromEntries(labels);
  for (const source of config?.sources || []) {
    const reference = source.reference;
    if (reference.displayId) prefixes.push(reference.displayId.prefix);
    let entries = recordItems(valueAtPath(document, reference.dataPath))
      .filter(record => !record._retired && !record.retired
        && (!reference.recordFilter || fieldVisible({ showWhen: reference.recordFilter }, record)))
      .map((record, index) => ({ id: formatRecordDisplayId(reference.displayId, record, index), record }));
    for (const entry of entries) {
      const label = text(entry.record[reference.labelField]);
      if (label) labels.set(entry.id, label);
    }
    if (config?.scope?.source === source.key) {
      const scope = new Set(records.flatMap(record => ids(record[config.scope!.field])));
      if (scope.size) entries = entries.filter(entry => scope.has(entry.id));
      const missing = [...scope].filter(id => !entries.some(entry => entry.id === id));
      if (missing.length) evidence.unavailableScope = missing;
    }
    const link = source.linkedFrom;
    if (link) {
      const parents = selected.get(link.source) || [];
      if (link.requireAll) {
        const allowed = new Set(parents.map(entry => entry.id));
        entries = entries.filter(entry => link.fields.every(key => ids(entry.record[key]).length
          && ids(entry.record[key]).every(id => allowed.has(id))));
      } else {
        const allowed = new Set(parents.flatMap(entry => link.fields.flatMap(key => ids(entry.record[key]))));
        entries = entries.filter(entry => allowed.has(entry.id));
      }
    }
    selected.set(source.key, entries);
    evidence[source.key] = { fields: ['id', ...source.fields], rows: entries.map(entry => [entry.id, ...source.fields.map(key => text(entry.record[key]))]) };
  }
  const keys = config?.recordFields || [];
  if (keys.length) {
    const rows = records.map(record => keys.map(key => text(record[key]))).filter(row => row.some(Boolean));
    if (rows.length) evidence.selectedScenarios = { fields: keys, rows };
  }
  return { labels, prefixes, evidence };
}
