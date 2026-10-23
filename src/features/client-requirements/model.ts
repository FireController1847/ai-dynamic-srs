import type { JsonValue, PortableRecord } from '../../core/workspace/dsrs-format.ts';

export const CR_BRIEF_KIND = 'cr.brief';
export const CR_BRIEF_ID = 'main';
export const CR_SOURCE_KIND = 'cr.source';

export interface BriefItem extends Record<string, JsonValue> {
  id: string;
  text: string;
}

export interface ClientBrief extends Record<string, JsonValue> {
  version: 1;
  organization: string;
  context: string;
  problem: string;
  solution: string;
  capabilities: BriefItem[];
  boundaries: BriefItem[];
}

export type BriefList = 'capabilities' | 'boundaries';
export type BriefField = 'organization' | 'context' | 'problem' | 'solution';

export type ClientSource =
  | { version: 1; type: 'text'; body: string; createdAt: string }
  | { version: 1; type: 'file'; name: string; mediaType: string; size: number; base64: string; createdAt: string };

export interface SourceEntry { id: string; data: ClientSource }

export function emptyBrief(): ClientBrief {
  return {
    version: 1, organization: '', context: '', problem: '', solution: '',
    capabilities: [], boundaries: [],
  };
}

export function copyBrief(value: ClientBrief): ClientBrief {
  return {
    ...value,
    capabilities: value.capabilities.map(item => ({ ...item })),
    boundaries: value.boundaries.map(item => ({ ...item })),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

function validItems(value: unknown): value is BriefItem[] {
  return Array.isArray(value) && value.every(item =>
    isObject(item) && typeof item.id === 'string' && item.id.trim() !== '' &&
    typeof item.text === 'string');
}

/** Never silently convert malformed or future-version brief records to empty data. */
export function parseBrief(value: unknown): ClientBrief {
  if (!isObject(value) || value.version !== 1 ||
      typeof value.organization !== 'string' ||
      typeof value.context !== 'string' ||
      typeof value.problem !== 'string' ||
      typeof value.solution !== 'string' ||
      !validItems(value.capabilities) || !validItems(value.boundaries)) {
    throw new Error('The saved Client Requirements brief cannot be read safely.');
  }
  const ids = [...value.capabilities, ...value.boundaries].map(item => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('The saved Client Requirements brief contains duplicate entry IDs.');
  }
  return {
    version: 1,
    organization: value.organization,
    context: value.context,
    problem: value.problem,
    solution: value.solution,
    capabilities: value.capabilities.map(item => ({ id: item.id, text: item.text })),
    boundaries: value.boundaries.map(item => ({ id: item.id, text: item.text })),
  };
}

export function briefRecord(brief: ClientBrief): PortableRecord {
  return { kind: CR_BRIEF_KIND, id: CR_BRIEF_ID, data: brief };
}

export function addBriefItem(brief: ClientBrief, list: BriefList, text: string): ClientBrief {
  return { ...brief, [list]: [...brief[list], { id: crypto.randomUUID(), text: text.trim() }] };
}

export function reorderBriefItem(brief: ClientBrief, list: BriefList, index: number, delta: number): ClientBrief {
  const target = index + delta;
  if (target < 0 || target >= brief[list].length) return brief;
  const next = [...brief[list]];
  [next[index], next[target]] = [next[target], next[index]];
  return { ...brief, [list]: next };
}

export function updateBriefItem(brief: ClientBrief, list: BriefList, id: string, text: string): ClientBrief {
  return { ...brief, [list]: brief[list].map(item => item.id === id ? { ...item, text } : item) };
}

export function removeBriefItem(brief: ClientBrief, list: BriefList, id: string): ClientBrief {
  return { ...brief, [list]: brief[list].filter(item => item.id !== id) };
}

export function parseSource(record: PortableRecord): SourceEntry | null {
  if (record.kind !== CR_SOURCE_KIND) return null;
  const value: unknown = record.data;
  if (!isObject(value) || value.version !== 1 || !validDate(value.createdAt)) {
    throw new Error('A saved original client document cannot be read safely.');
  }
  if (value.type === 'text' && typeof value.body === 'string') {
    return { id: record.id, data: {
      version: 1, type: 'text', body: value.body, createdAt: value.createdAt,
    } };
  }
  if (value.type === 'file' && typeof value.name === 'string' &&
      typeof value.mediaType === 'string' && typeof value.base64 === 'string' &&
      typeof value.size === 'number' && Number.isSafeInteger(value.size) && value.size >= 0) {
    return { id: record.id, data: {
      version: 1, type: 'file', name: value.name, mediaType: value.mediaType,
      size: value.size, base64: value.base64, createdAt: value.createdAt,
    } };
  }
  throw new Error('A saved original client document cannot be read safely.');
}

export function sourceEntries(records: readonly PortableRecord[]): SourceEntry[] {
  const entries: SourceEntry[] = [];
  for (const record of records) {
    const entry = parseSource(record);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) =>
    a.data.createdAt.localeCompare(b.data.createdAt) || a.id.localeCompare(b.id));
}

export function textSource(body: string): PortableRecord {
  return {
    kind: CR_SOURCE_KIND, id: crypto.randomUUID(),
    data: { version: 1, type: 'text', body, createdAt: new Date().toISOString() },
  };
}

export function fileSource(file: File, base64: string): PortableRecord {
  return {
    kind: CR_SOURCE_KIND, id: crypto.randomUUID(),
    data: {
      version: 1, type: 'file', name: file.name, mediaType: file.type,
      size: file.size, base64, createdAt: new Date().toISOString(),
    },
  };
}

export function readFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the original document.'));
    reader.onabort = () => reject(new Error('Document reading was cancelled.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string' || !result.includes(',')) {
        reject(new Error('Could not read the original document.'));
      } else {
        resolve(result.slice(result.indexOf(',') + 1));
      }
    };
    reader.readAsDataURL(file);
  });
}

export function downloadOriginal(source: Extract<ClientSource, { type: 'file' }>): void {
  const binary = atob(source.base64);
  if (binary.length !== source.size) throw new Error('The original file is incomplete.');
  const buffer = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/octet-stream' }));
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = source.name;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
