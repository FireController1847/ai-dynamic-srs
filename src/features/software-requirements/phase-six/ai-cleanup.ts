import type { DataModel, DocumentModel, SchemaNode } from '../../../core/schema/schema-types.ts';
import { isDataModel } from '../../../core/schema/data-models.ts';
import { createDocumentState } from '../../../core/schema/state-factory.ts';

export type CleanupOperation = 'add' | 'replace' | 'remove';
export type CleanupKind = 'reduction' | 'expansion' | 'neutral';
export interface CleanupSize { words: number; characters: number; }
export interface CleanupImpact { before: CleanupSize; after: CleanupSize; wordDelta: number; characterDelta: number; }
export interface CleanupChange {
  index: number;
  op: CleanupOperation;
  path: string;
  reason: string;
  previous: unknown;
  value?: unknown;
  kind: CleanupKind;
  wordDelta: number;
  characterDelta: number;
}
export interface CleanupPlan {
  changes: CleanupChange[];
  document: DocumentModel;
  impact: CleanupImpact;
}

const SRS = 'softwareRequirementsSpecification';
const EDITABLE_ROOTS = new Set([
  'records', 'baselineConstruction', 'actorGoalDiscovery',
  'functionalBehaviorDescription', 'qualityInterfaceSpecification',
  'modelCrossChecks', 'specificationReconciliation'
]);

function fail(message: string): never {
  throw new Error('AI cleanup: ' + message);
}

function copy<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return value.length.toString(16) + '-' + (h >>> 0).toString(16).padStart(8, '0');
}

/** Fingerprint all saved project content, not navigation timestamps or app chrome. */
export function cleanupSourceHash(document: DocumentModel): string {
  return hash(JSON.stringify(document) || '');
}

export function cleanupPrompt(document: DocumentModel): string {
  const baseHash = cleanupSourceHash(document);
  return [
    '# Dynamic SRS — optional Phase 6, Step 5 cleanup',
    '',
    'Attach the complete Dynamic SRS workspace JSON exported alongside this prompt. Read all of it before proposing changes. Do not ask the user to repeat known information. This is the final cross-phase cleanup before Phase 7 assembles the SRS.',
    '',
    'PRIMARY OBJECTIVE: perform a substantial, document-wide CLEANUP. Systematically examine every populated narrative field and each canonical record across Phases 1–6. Rewrite wordy sentences into direct, brief statements; remove repeated explanations and redundant records; consolidate overlaps; repair confirmed inconsistencies. Be willing to touch hundreds of fields if they benefit from editing: this is an intensive edit pass, not a handful of token changes. The cleaned SRS should generally contain markedly LESS prose. Preserve unique facts, obligations, conditions, decisions, acceptance evidence and audit history rather than preserving unnecessary words. Do not target an arbitrary reduction percentage or make cosmetic edits for a quota.',
    '',
    'Work through the complete SRS inventory, not just the most obvious examples. Priority: (1) REPLACE long narrative values with concise, meaningful versions throughout the SRS, including requirements and descriptions; (2) REMOVE obsolete, duplicate, redundant or misplaced content when its unique meaning is already captured canonically; (3) CONSOLIDATE overlapping fields or records at a single appropriate source and update dependent links; (4) CORRECT proven inconsistencies and broken references from existing evidence; (5) ADD only the smallest needed correction when no replacement or removal will suffice. A large number of replacements and removals is normal and desirable when justified. Do not be timid about structural cleanup. Additions should be rare, narrowly scoped, and evidence-backed, never requirements expansion.',
    '',
    'Prefer one or two precise sentences over a lengthy paragraph, especially in early phases where later stages already provide the details. Remove verbosity even when the existing text is technically correct. Do not fill every blank, manufacture explanations or edge cases, expand statements for polish, or add new requirements. Avoid inserting information merely because an empty field exists. Delete genuinely redundant material while retaining unique information at its canonical source. Repairs that need a longer replacement or add must be uncommon and cite the existing evidence in their short reason. If the net proposal increases prose, revisit it aggressively and strip nonessential expansions. Use all earlier project evidence to reconcile, not to generate a second specification. Respect client approvals, status provenance, audit trails, and facts about verification; never invent approvals or passed tests.',
    '',
    'Return ONLY a JSON changeset, NOT a complete workspace. Use RFC 6901 JSON Pointer paths into document.sections. Supported ops: add (object property or array insert/append using /-), replace (existing target), remove (existing target). Paths must begin with /document/sections/softwareRequirementsSpecification/ and then one of: records, baselineConstruction, actorGoalDiscovery, functionalBehaviorDescription, qualityInterfaceSpecification, modelCrossChecks, specificationReconciliation. You may edit any nested fields and existing or new records, including statuses, identifiers, relationships and models, when evidence justifies it. Phase 7 and unrelated top-level documents are read-only context. Do not modify workspace metadata or navigation state.',
    '',
    'Return format: {"format":"dsrs-cleanup","version":2,"baseHash":"' + baseHash + '","changes":[{"op":"replace","path":"/document/sections/softwareRequirementsSpecification/records/requirements/0/statement","value":"Revised statement","reason":"Remove duplicated rationale"}]}',
    'The example is illustrative; use real paths from the attached JSON and include only actual modifications. For add/replace include "value" of any JSON type. For remove omit "value". Give every change a short reason explaining specifically what redundancy was removed or what documented inconsistency was corrected. For additions and longer replacements, cite the already-saved evidence that makes them indispensable. Preserve JSON Pointer escaping (~1 for /, ~0 for ~) and array indices in sequential operation order. Keep stable IDs where possible; repair dependent references in the same changeset when IDs change. Do not ask routine confirmation questions. Return {"format":"dsrs-cleanup","version":2,"baseHash":"' + baseHash + '","changes":[]} if no meaningful reductions or essential corrections are justified.',
    '',
    'Do not include Markdown fences, commentary, the original full JSON, or changes outside this scope.'
  ].join('\n');
}

function pathSegments(pointer: string): string[] {
  if (!pointer.startsWith('/')) return fail('paths must be absolute JSON pointers.');
  const raw = pointer.slice(1).split('/');
  for (const segment of raw) {
    if (/~(?![01])/.test(segment) || ['__proto__', 'prototype', 'constructor'].includes(segment.replace(/~1/g, '/').replace(/~0/g, '~'))) {
      return fail('invalid or unsafe JSON pointer segment.');
    }
  }
  const segments = raw.map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  if (segments.length < 5 || segments[0] !== 'document' || segments[1] !== 'sections'
    || segments[2] !== SRS || !EDITABLE_ROOTS.has(segments[3])) {
    return fail('changes must target saved SRS Phases 1–6 or their shared records.');
  }
  return segments.slice(2);
}

function arrayIndex(segment: string, length: number, op: CleanupOperation, final: boolean): number {
  if (op === 'add' && final && segment === '-') return length;
  if (!/^(0|[1-9]\d*)$/.test(segment)) return fail('array indices must be non-negative integers (or - for append).');
  const index = Number(segment);
  if (!Number.isSafeInteger(index) || index > length || (op !== 'add' && index === length)) return fail('array index is out of bounds.');
  return index;
}

function lookup(container: unknown, part: string): unknown {
  if (Array.isArray(container)) return container[arrayIndex(part, container.length, 'replace', false)];
  if (isDataModel(container) && Object.hasOwn(container, part)) return container[part];
  return fail('a parent path does not exist.');
}

function patch(document: DocumentModel, operation: CleanupOperation, pointer: string, value: unknown): unknown {
  const parts = pathSegments(pointer);
  let parent: unknown = document;
  for (const segment of parts.slice(0, -1)) parent = lookup(parent, segment);
  const final = parts[parts.length - 1];
  if (Array.isArray(parent)) {
    const index = arrayIndex(final, parent.length, operation, true);
    const previous = operation === 'add' ? undefined : copy(parent[index]);
    if (operation === 'add') parent.splice(index, 0, copy(value));
    else if (operation === 'replace') parent.splice(index, 1, copy(value));
    else parent.splice(index, 1);
    return previous;
  }
  if (!isDataModel(parent)) return fail('target parent must be an object or array.');
  const exists = Object.hasOwn(parent, final);
  if (operation === 'add' && exists) return fail('add targets an existing property; use replace.');
  if (operation !== 'add' && !exists) return fail('replace/remove targets a missing property.');
  const previous = exists ? copy(parent[final]) : undefined;
  if (operation === 'remove') delete parent[final];
  else parent[final] = copy(value);
  return previous;
}

function parse(input: string, document: DocumentModel): { changes: DataModel[] } {
  let value: unknown;
  const text = input.trim().replace(/^```(?:json)?\s*|\s*```$/gi, '');
  try { value = JSON.parse(text); } catch { return fail('paste valid changeset JSON.'); }
  if (!isDataModel(value) || value.format !== 'dsrs-cleanup' || value.version !== 2
    || typeof value.baseHash !== 'string' || value.baseHash !== cleanupSourceHash(document)
    || !Array.isArray(value.changes)
    || Object.keys(value).some(key => !['format', 'version', 'baseHash', 'changes'].includes(key))) {
    return fail('expected dsrs-cleanup v2 with matching baseHash and a changes array. Export a fresh JSON and recopy the prompt if your workspace changed.');
  }
  return { changes: value.changes as DataModel[] };
}

/** Approximate author-facing prose volume; excludes metadata, figure files and encoded payloads. */
function measure(value: unknown, field = ''): CleanupSize {
  if (typeof value === 'string') {
    if (/^(?:id|_.*|file|fileContent|dataUrl|image|svg|xml|drawio|payload|blob|base64|graph|contentLocation)$/i.test(field)) {
      return { words: 0, characters: 0 };
    }
    const text = value.trim();
    if (!/\s/u.test(text) || /^(?:<\?xml|<mxfile|<svg|data:|\{\s*"format"\s*:)/i.test(text)) {
      return { words: 0, characters: 0 };
    }
    const normalized = text.replace(/\s+/gu, ' ');
    return { words: normalized.split(' ').length, characters: normalized.length };
  }
  if (Array.isArray(value)) return value.reduce<CleanupSize>((sum, item) => {
    const next = measure(item);
    return { words: sum.words + next.words, characters: sum.characters + next.characters };
  }, { words: 0, characters: 0 });
  if (isDataModel(value)) return Object.entries(value).reduce<CleanupSize>((sum, [key, item]) => {
    const next = measure(item, key);
    return { words: sum.words + next.words, characters: sum.characters + next.characters };
  }, { words: 0, characters: 0 });
  return { words: 0, characters: 0 };
}

function phaseContent(document: DocumentModel): DataModel {
  const state = document[SRS] || {};
  return Object.fromEntries([...EDITABLE_ROOTS].map(key => [key, state[key]]));
}

function impact(before: CleanupSize, after: CleanupSize): CleanupImpact {
  return { before, after, wordDelta: after.words - before.words, characterDelta: after.characters - before.characters };
}

function classify(op: CleanupOperation, delta: CleanupImpact): CleanupKind {
  if (op === 'add') return 'expansion';
  if (op === 'remove') return 'reduction';
  if (delta.wordDelta > 0 || (delta.wordDelta === 0 && delta.characterDelta > 0)) return 'expansion';
  if (delta.wordDelta < 0 || (delta.wordDelta === 0 && delta.characterDelta < 0)) return 'reduction';
  return 'neutral';
}

/** Validate all operations on a detached clone, never the live document. */
export function planCleanup(document: DocumentModel, pages: readonly SchemaNode[], input: string, selected?: readonly number[]): CleanupPlan {
  const entries = parse(input, document).changes;
  const selection = selected ? new Set(selected) : null;
  const draft = copy(document);
  const changes: CleanupChange[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry: unknown = entries[index];
    if (!isDataModel(entry)) return fail('change ' + (index + 1) + ' must be an object.');
    const op = entry.op;
    if (op !== 'add' && op !== 'replace' && op !== 'remove') return fail('change ' + (index + 1) + ' uses an unsupported operation.');
    if (typeof entry.path !== 'string' || (entry.reason !== undefined && typeof entry.reason !== 'string')
      || Object.keys(entry).some(key => !['op', 'path', 'value', 'reason'].includes(key))
      || (op === 'remove' ? Object.hasOwn(entry, 'value') : !Object.hasOwn(entry, 'value'))) {
      return fail('change ' + (index + 1) + ' must contain op, path, optional reason, and a value only for add/replace.');
    }
    // Always validate every path, including unselected changes; apply selected ops in original order.
    pathSegments(entry.path);
    if (selection && !selection.has(index)) continue;
    try {
      const previous = patch(draft, op, entry.path, entry.value);
      const difference = impact(measure(previous), measure(op === 'remove' ? undefined : entry.value));
      changes.push({ index, op, path: entry.path, reason: typeof entry.reason === 'string' ? entry.reason : '',
        previous, ...(op === 'remove' ? {} : { value: entry.value }),
        kind: classify(op, difference), wordDelta: difference.wordDelta, characterDelta: difference.characterDelta });
    } catch (error) {
      return fail('change ' + (index + 1) + ': ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  const normalized = createDocumentState(pages, draft);
  return { changes, document: normalized, impact: impact(measure(phaseContent(document)), measure(phaseContent(normalized))) };
}

/** The caller must validate against current state, then swap one canonical SRS root atomically. */
export function applyCleanup(document: DocumentModel, plan: CleanupPlan): void {
  document[SRS] = plan.document[SRS];
}

export function cleanupPreview(value: unknown): string {
  if (value === undefined) return '(not present)';
  const json = JSON.stringify(value, null, 2) || String(value);
  return json.length > 1600 ? json.slice(0, 1600) + '\n… (preview truncated)' : json;
}
