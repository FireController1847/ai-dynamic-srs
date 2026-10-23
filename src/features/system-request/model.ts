import type { JsonValue, PortableRecord } from '../../core/workspace/dsrs-format.ts';

export const SR_REQUEST_KIND = 'sr.request';
export const SR_REQUEST_ID = 'main';

export interface RequestEntry extends Record<string, JsonValue> {
  id: string;
  text: string;
}

export interface ValueEntry extends Record<string, JsonValue> {
  id: string;
  text: string;
  type: 'qualitative' | 'measurable';
  target: string;
}

/** Project initiation, not a detailed requirement specification or cost-benefit model. */
export interface SystemRequest extends Record<string, JsonValue> {
  version: 1;
  date: string;
  preparedBy: string;
  sponsorOrganization: string;
  sponsorContact: string;
  sponsorRole: string;
  sponsorDetails: string;
  businessNeed: string;
  requirements: RequestEntry[];
  benefits: ValueEntry[];
  specialIssues: RequestEntry[];
}

export type RequestField =
  | 'date' | 'preparedBy' | 'sponsorOrganization' | 'sponsorContact'
  | 'sponsorRole' | 'sponsorDetails' | 'businessNeed';
export type RequestList = 'requirements' | 'specialIssues';

export function emptyRequest(): SystemRequest {
  return {
    version: 1, date: '', preparedBy: '', sponsorOrganization: '',
    sponsorContact: '', sponsorRole: '', sponsorDetails: '', businessNeed: '',
    requirements: [], benefits: [], specialIssues: [],
  };
}

export function copyRequest(value: SystemRequest): SystemRequest {
  return {
    ...value,
    requirements: value.requirements.map(item => ({ ...item })),
    benefits: value.benefits.map(item => ({ ...item })),
    specialIssues: value.specialIssues.map(item => ({ ...item })),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function entryList(value: unknown): value is RequestEntry[] {
  return Array.isArray(value) && value.every(item =>
    isObject(item) && typeof item.id === 'string' && item.id.trim() !== '' &&
    typeof item.text === 'string');
}
function valueList(value: unknown): value is ValueEntry[] {
  return Array.isArray(value) && value.every(item =>
    isObject(item) && typeof item.id === 'string' && item.id.trim() !== '' &&
    typeof item.text === 'string' &&
    (item.type === 'qualitative' || item.type === 'measurable') &&
    typeof item.target === 'string');
}
function validDocumentDate(value: unknown): value is string {
  if (value === '') return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

/** Reject malformed or unknown versions rather than silently erasing work on import. */
export function parseRequest(value: unknown): SystemRequest {
  if (!isObject(value) || value.version !== 1 ||
    !validDocumentDate(value.date) ||
    !['preparedBy', 'sponsorOrganization', 'sponsorContact', 'sponsorRole',
      'sponsorDetails', 'businessNeed'].every(key => typeof value[key] === 'string') ||
    !entryList(value.requirements) || !valueList(value.benefits) ||
    !entryList(value.specialIssues)) {
    throw new Error('The saved System Request cannot be read safely.');
  }
  const ids = [...value.requirements, ...value.benefits, ...value.specialIssues].map(item => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('The saved System Request contains duplicate entry IDs.');
  }
  return {
    version: 1, date: value.date,
    preparedBy: value.preparedBy as string,
    sponsorOrganization: value.sponsorOrganization as string,
    sponsorContact: value.sponsorContact as string,
    sponsorRole: value.sponsorRole as string,
    sponsorDetails: value.sponsorDetails as string,
    businessNeed: value.businessNeed as string,
    requirements: value.requirements.map(item => ({ id: item.id, text: item.text })),
    benefits: value.benefits.map(item => ({
      id: item.id, text: item.text, type: item.type, target: item.target,
    })),
    specialIssues: value.specialIssues.map(item => ({ id: item.id, text: item.text })),
  };
}

export function requestRecord(value: SystemRequest): PortableRecord {
  return { kind: SR_REQUEST_KIND, id: SR_REQUEST_ID, data: value };
}

export function addEntry(request: SystemRequest, list: RequestList, text: string): SystemRequest {
  return {
    ...request,
    [list]: [...request[list], { id: crypto.randomUUID(), text: text.trim() }],
  };
}
export function updateEntry(request: SystemRequest, list: RequestList, id: string, text: string): SystemRequest {
  return { ...request, [list]: request[list].map(item => item.id === id ? { ...item, text } : item) };
}
export function removeEntry(request: SystemRequest, list: RequestList, id: string): SystemRequest {
  return { ...request, [list]: request[list].filter(item => item.id !== id) };
}
export function addBenefit(request: SystemRequest, text: string, type: ValueEntry['type']): SystemRequest {
  return {
    ...request,
    benefits: [...request.benefits, { id: crypto.randomUUID(), text: text.trim(), type, target: '' }],
  };
}
export function updateBenefit(request: SystemRequest, id: string, patch: Partial<Pick<ValueEntry, 'text' | 'type' | 'target'>>): SystemRequest {
  return {
    ...request,
    benefits: request.benefits.map(item => item.id === id ? { ...item, ...patch } : item),
  };
}
export function removeBenefit(request: SystemRequest, id: string): SystemRequest {
  return { ...request, benefits: request.benefits.filter(item => item.id !== id) };
}
export function reorderEntries<T extends RequestEntry | ValueEntry>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
