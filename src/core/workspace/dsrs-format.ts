/** Portable .dsrs interchange format; independent of the IndexedDB schema. */
export const DSRS_FORMAT = 'dynamic-srs';
export const DSRS_VERSION = 1;
export const MAX_IMPORT_BYTES = 128 * 1024 * 1024; // Guard JSON parsing, not record counts.

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export interface PortableRecord { kind: string; id: string; data: JsonValue }
export interface WorkspaceIdentity { id: string; name: string; createdAt: string }
export interface DsrsFile {
  format: typeof DSRS_FORMAT;
  version: typeof DSRS_VERSION;
  workspace: WorkspaceIdentity;
  records: PortableRecord[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}
function named(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function isoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}
function jsonValue(value: unknown, depth = 0): value is JsonValue {
  if (depth > 100) return false; // Reject maliciously deep imported structures.
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => jsonValue(item, depth + 1));
  return isObject(value) && Object.entries(value).every(([key, item]) =>
    !['__proto__', 'constructor', 'prototype'].includes(key) && jsonValue(item, depth + 1));
}

export function validatePortableRecord(value: unknown): PortableRecord {
  if (!isObject(value) || !exactKeys(value, ['kind', 'id', 'data']) ||
      !named(value.kind) || !named(value.id) ||
      !Object.hasOwn(value, 'data') || !jsonValue(value.data)) {
    throw new Error('This workspace contains an invalid record.');
  }
  return { kind: value.kind, id: value.id, data: value.data };
}

export function validateDsrs(value: unknown): DsrsFile {
  if (!isObject(value) || !exactKeys(value, ['format', 'version', 'workspace', 'records']) ||
      value.format !== DSRS_FORMAT || value.version !== DSRS_VERSION ||
      !isObject(value.workspace) || !exactKeys(value.workspace, ['id', 'name', 'createdAt']) ||
      !named(value.workspace.id) || !named(value.workspace.name) ||
      !isoDate(value.workspace.createdAt) || !Array.isArray(value.records)) {
    throw new Error('This is not a supported Dynamic SRS .dsrs workspace (version 1).');
  }
  const records = value.records.map(validatePortableRecord);
  const seen = new Set<string>();
  for (const { kind, id } of records) {
    const key = JSON.stringify([kind, id]);
    if (seen.has(key)) throw new Error('The .dsrs file has duplicate record identities.');
    seen.add(key);
  }
  return {
    format: DSRS_FORMAT, version: DSRS_VERSION,
    workspace: { id: value.workspace.id, name: value.workspace.name, createdAt: value.workspace.createdAt },
    records,
  };
}

export function parseDsrs(source: string): DsrsFile {
  if (new Blob([source]).size > MAX_IMPORT_BYTES) throw new Error('This .dsrs file exceeds 128 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(source) as unknown; }
  catch { throw new Error('The selected .dsrs file is not valid JSON.'); }
  return validateDsrs(parsed);
}

export function serializeDsrs(source: unknown): string {
  const value = validateDsrs(source);
  const records = [...value.records].sort((a, b) =>
    a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  return JSON.stringify({ ...value, records }, null, 2) + '\n';
}
