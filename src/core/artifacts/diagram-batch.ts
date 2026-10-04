import type { DataModel } from '../schema/schema-types.ts';
import { isDataModel } from '../schema/data-models.ts';
import type { DiagramConfig, DiagramContext, DiagramGraph } from './diagram-graph.ts';
import { diagramContext } from './diagram-context.ts';
import { MAX_DIAGRAM_FILE_BYTES } from './diagram-files.ts';
import { parseDiagramResponse } from './diagram-ir.ts';

export const MAX_DIAGRAM_BATCH_FIGURES = 32;

export interface DiagramBatchFigure {
  metadata: DataModel;
  graph: DiagramGraph;
}

function fail(message: string): never {
  throw new Error(`Invalid dsrs-diagrams response: ${message}`);
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string') fail(`${where} must be a string.`);
  const normalized = value.trim();
  if (normalized.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(normalized)) {
    fail(`${where} must be plain text of at most 500 characters.`);
  }
  return normalized;
}

function ids(value: unknown, where: string): string {
  const values = Array.isArray(value)
    ? value.map((item, index) => text(item, `${where}[${index}]`))
    : text(value, where).split(/[\s,;]+/).filter(Boolean);
  return [...new Set(values)].join(', ');
}

function parsedEnvelope(response: string): DataModel {
  if (new TextEncoder().encode(response).byteLength > MAX_DIAGRAM_FILE_BYTES) {
    fail('the pasted response exceeds the 2 MB response limit.');
  }
  const pasted = response.trim();
  const fenced = /^\`\`\`dsrs-diagrams[ \t]*\r?\n([\s\S]*?)\r?\n\`\`\`$/.exec(pasted);
  if (!fenced && !pasted.startsWith('{')) {
    fail('paste one fenced dsrs-diagrams JSON block or just its JSON object, with no surrounding prose.');
  }
  let input: unknown;
  try {
    input = JSON.parse(fenced ? fenced[1]! : pasted);
  } catch {
    return fail('the batch is not valid JSON.');
  }
  if (!isDataModel(input) || Object.keys(input).some(key => key !== 'figures') || !Array.isArray(input.figures)) {
    fail('the root object must contain only a figures array.');
  }
  if (!input.figures.length) fail('the figures array is empty.');
  if (input.figures.length > MAX_DIAGRAM_BATCH_FIGURES) {
    fail(`the figures array exceeds the ${MAX_DIAGRAM_BATCH_FIGURES}-figure batch limit.`);
  }
  return input;
}

function evidenceSourceIds(context: DiagramContext, source: string): Set<string> {
  const value = context.evidence[source];
  if (!isDataModel(value) || !Array.isArray(value.rows)) return new Set();
  return new Set(value.rows.flatMap(row => Array.isArray(row) && row.length ? [String(row[0])] : []));
}

function unavailableScope(context: DiagramContext): string[] {
  const value = context.evidence.unavailableScope;
  return Array.isArray(value) ? value.map(String) : [];
}

function rawNodeReferences(graph: DataModel, kind: string, allowed: Set<string>, where: string): Set<string> {
  if (!Array.isArray(graph.n)) fail(`${where}.graph.n must be an array.`);
  const refs = new Set<string>();
  graph.n.forEach((node, index) => {
    if (!Array.isArray(node) || node[1] !== kind) return;
    const reference = node[2];
    if (typeof reference !== 'string' || !allowed.has(reference)) {
      fail(`${where}.graph.n[${index}] ${kind} must use a canonical ID declared by this figure's metadata.`);
    }
    refs.add(reference);
  });
  return refs;
}

function sameSet(left: Set<string>, right: Set<string>) {
  return left.size === right.size && [...left].every(value => right.has(value));
}

function normalizeFigureMetadata(
  value: DataModel,
  config: DiagramConfig,
  document: DataModel,
  index: number
): { metadata: DataModel; context: DiagramContext } {
  const contract = config.batch;
  if (!contract) fail(`diagram type "${config.type}" does not support section-level batch generation.`);
  const allowed = new Map(contract.metadata.map(field => [field.field, field]));
  const unknown = Object.keys(value).filter(key => key !== 'graph' && !allowed.has(key));
  if (unknown.length) fail(`figures[${index}] contains unsupported metadata: ${unknown.join(', ')}.`);

  const metadata: DataModel = {};
  for (const descriptor of contract.metadata) {
    const raw = value[descriptor.field];
    if (raw === undefined) {
      if (descriptor.required) fail(`figures[${index}].${descriptor.field} is required.`);
      continue;
    }
    const normalized = descriptor.source
      ? ids(raw, `figures[${index}].${descriptor.field}`)
      : text(raw, `figures[${index}].${descriptor.field}`);
    if (descriptor.required && !normalized) fail(`figures[${index}].${descriptor.field} cannot be blank.`);
    if (normalized) metadata[descriptor.field] = normalized;
  }

  const context = diagramContext(config, document, [metadata]);
  const missing = unavailableScope(context);
  if (missing.length) {
    fail(`figures[${index}] references unavailable scope IDs: ${missing.join(', ')}.`);
  }

  for (const descriptor of contract.metadata.filter(field => field.source)) {
    const supplied = new Set(String(metadata[descriptor.field] || '').split(/[\s,;]+/).filter(Boolean));
    if (!supplied.size && !descriptor.required) continue;
    const available = evidenceSourceIds(context, descriptor.source!);
    const invalid = [...supplied].filter(id => !available.has(id));
    if (invalid.length) {
      fail(`figures[${index}].${descriptor.field} contains IDs outside this figure's available evidence: ${invalid.join(', ')}.`);
    }
  }

  return { metadata, context };
}

export function parseDiagramBatchResponse(
  response: string,
  config: DiagramConfig,
  document: DataModel
): DiagramBatchFigure[] {
  const input = parsedEnvelope(response);
  const titleSet = new Set<string>();

  return (input.figures as unknown[]).map((raw, index) => {
    if (!isDataModel(raw)) fail(`figures[${index}] must be an object.`);
    if (!Object.hasOwn(raw, 'graph') || !isDataModel(raw.graph)) fail(`figures[${index}].graph must be an object.`);

    const { metadata, context } = normalizeFigureMetadata(raw, config, document, index);
    const title = String(metadata.title || '');
    if (titleSet.has(title)) fail(`figures[${index}] duplicates figure title "${title}".`);
    titleSet.add(title);

    const graph = parseDiagramResponse(JSON.stringify(raw.graph), context, config.type);

    for (const descriptor of config.batch?.metadata || []) {
      if (!descriptor.source || !descriptor.nodeKind) continue;
      const supplied = new Set(String(metadata[descriptor.field] || '').split(/[\s,;]+/).filter(Boolean));
      const available = evidenceSourceIds(context, descriptor.source);
      const graphRefs = rawNodeReferences(raw.graph as DataModel, descriptor.nodeKind, available, `figures[${index}]`);
      if (!sameSet(supplied, graphRefs)) {
        fail(`figures[${index}].${descriptor.field} must exactly match the canonical ${descriptor.nodeKind} IDs used by its graph.`);
      }
    }

    return { metadata, graph };
  });
}
