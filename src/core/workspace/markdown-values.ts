import type { Field } from '../schema/schema-types.ts';
import { isDataModel } from '../schema/data-models.ts';
import { hasValue } from '../records/record-values.ts';

export function savedTitle(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, char => char.toUpperCase());
}
export function inlineTitle(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/[\\`*_{}\[\]<>#|]/g, '\\$&').trim();
}
export function markdownHeading(title: string, depth: number): string {
  return depth <= 6 ? `${'#'.repeat(Math.max(1, depth))} ${inlineTitle(title)}` : `**${inlineTitle(title)}**`;
}
export function internalSavedKey(key: string): boolean { return key.startsWith('_') || key === 'retired'; }

export function isSavedDiagram(value: unknown): boolean {
  return isDataModel(value) && (typeof value.artifactKind === 'string'
    || (typeof value.content === 'string' && /^(?:\s*(?:<\?xml[^>]*>\s*)?<(?:mxfile|mxGraphModel)\b|data:image\/)/.test(value.content)));
}
function paragraph(value: string): string {
  // Keep authored Markdown intact, but keep its own headings inside the answer's block.
  return value.trim().split(/\r?\n/).map(line => `> ${line}`).join('\n');
}

export function savedMarkdownValue(value: unknown, field?: Field): string {
  if (!hasValue(value)) return '';
  if (field?.type === 'diagram-file' || isSavedDiagram(value)) {
    if (!isDataModel(value)) return '';
    return ['sourceFileName', 'artifactKind', 'mediaType', 'sizeBytes', 'uploadedAt', 'lastModified']
      .filter(key => hasValue(value[key])).map(key => `- **${savedTitle(key)}:** ${String(value[key])}`).join('\n');
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const option = field?.options?.find(option => (typeof option === 'object' ? option.value : option) === value);
    const label = option && typeof option === 'object' ? option.label : String(value);
    return paragraph(label);
  }
  if (Array.isArray(value)) {
    if (field?.type === 'period-values') return value.map((entry, i) => hasValue(entry) ? `- **Year ${i + 1}:** ${String(entry)}` : '').filter(Boolean).join('\n');
    if (value.every(entry => typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean')) {
      return value.map(entry => hasValue(entry) ? `- ${String(entry)}` : '').filter(Boolean).join('\n');
    }
    return value.map((entry, index) => {
      const body = savedMarkdownValue(entry, field?.type === 'nested-records' ? { key: '', label: '', fields: field.fields } : undefined);
      const id = isDataModel(entry) && hasValue(entry.id) ? ` (saved ID ${String(entry.id)})` : '';
      const retired = isDataModel(entry) && (entry._retired || entry.retired) ? ' [retired]' : '';
      return body ? `**${inlineTitle(field?.itemLabel || 'Entry')} ${index + 1}${id}${retired}**\n\n${body}` : '';
    }).filter(Boolean).join('\n\n');
  }
  if (isDataModel(value)) {
    return Object.entries(value).filter(([key]) => key !== 'id' && !internalSavedKey(key)).map(([key, item]) => {
      const descriptor = field?.fields?.find(child => child.key === key);
      const body = savedMarkdownValue(item, descriptor);
      return body ? `**${inlineTitle(descriptor?.label || savedTitle(key))}**\n\n${body}` : '';
    }).filter(Boolean).join('\n\n');
  }
  return '';
}
