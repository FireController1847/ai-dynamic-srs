import type { DataModel, SchemaNode } from '../schema/schema-types.ts';
import { isDataModel, valueAtPath } from '../schema/data-models.ts';
import { formatRecordDisplayId, hasValue } from '../records/record-values.ts';
import type { MarkdownAnswer, MarkdownNode, MarkdownSection, SavedPath } from './markdown-index.ts';
import { markdownIndex, pathKey } from './markdown-index.ts';
import { inlineTitle, internalSavedKey, isSavedDiagram, markdownHeading, savedMarkdownValue, savedTitle } from './markdown-values.ts';

interface MarkdownMetadata { title: string; applicationVersion?: string; exportedAt?: string; }

export function workspaceMarkdown(pages: readonly SchemaNode[], document: DataModel, metadata: MarkdownMetadata): string {
  const { nodes, homes, jobs } = markdownIndex(pages, document);
  const claimed = new Set<string>();
  const extras = new Map<string, string>();
  for (const job of jobs) for (const answer of job.answers) claimed.add(pathKey(answer.path));

  /** Preserve saved values outside the active forms, with readable fallback labels. */
  function residual(value: unknown, path: SavedPath): string {
    if (claimed.has(pathKey(path))) return '';
    if (Array.isArray(value)) return value.map((entry, i) => {
      const body = residual(entry, [...path, i]);
      const id = isDataModel(entry) && hasValue(entry.id) ? ` (saved ID ${String(entry.id)})` : '';
      const retired = isDataModel(entry) && (entry._retired || entry.retired) ? ' [retired]' : '';
      return body ? `**Entry ${i + 1}${id}${retired}**\n\n${body}` : '';
    }).filter(Boolean).join('\n\n');
    if (!isDataModel(value)) return savedMarkdownValue(value);
    // Unknown diagram payloads must be summarized too, never dumped as XML/base64.
    if (isSavedDiagram(value)) return savedMarkdownValue(value);
    return Object.entries(value).filter(([key]) => key !== 'id' && !internalSavedKey(key)).map(([key, item]) => {
      const body = residual(item, [...path, key]);
      return body ? `**${inlineTitle(savedTitle(key))}**\n\n${body}` : '';
    }).filter(Boolean).join('\n\n');
  }
  for (const [key, home] of homes) {
    const extra = residual(home.record, home.path);
    if (extra) extras.set(key, extra);
    // The canonical collection is handled record-by-record; do not render it again at the root.
    claimed.add(key);
  }
  function nodeExtras(node: MarkdownNode): void {
    node.children.forEach(nodeExtras);
    const model = valueAtPath(document, node.path);
    if (isDataModel(model)) {
      node.extra = Object.entries(model).filter(([key]) => !node.children.some(child => child.schema.stateKey === key)
        && !internalSavedKey(key)).map(([key, value]) => {
        const body = residual(value, [...node.path, key]);
        return body ? `**${inlineTitle(savedTitle(key))}**\n\n${body}` : '';
      }).filter(Boolean).join('\n\n');
    }
    claimed.add(pathKey(node.path));
  }
  nodes.forEach(nodeExtras);

  function answerText(answer: MarkdownAnswer): string {
    const body = savedMarkdownValue(answer.value, answer.field);
    return body ? `**${inlineTitle(answer.field.label)}${answer.inactive ? ' (saved inactive value)' : ''}**\n\n${body}` : '';
  }
  function sectionText(job: MarkdownSection, depth: number): string {
    const body: string[] = [];
    if (!job.section.repeatable) body.push(...job.answers.map(answerText).filter(Boolean));
    else {
      const records = new Map<string, MarkdownAnswer[]>();
      job.answers.forEach(answer => {
        const key = pathKey(answer.recordPath!);
        records.set(key, [...(records.get(key) || []), answer]);
      });
      for (const [key, home] of homes) if (home.job === job && !records.has(key) && extras.has(key)) records.set(key, []);
      for (const [key, answers] of records) {
        const home = homes.get(key)!;
        const record = home.record, repeater = job.section.repeatable;
        const index = Number(home.path.at(-1));
        const identity = repeater.displayId ? formatRecordDisplayId(repeater.displayId, record, index) : `${repeater.itemLabel || 'Record'} ${index + 1}${hasValue(record.id) ? ` (saved ID ${record.id})` : ''}`;
        const primary = answers.find(answer => answer.field.key === repeater.primaryField && answer.field.type === 'text' && typeof answer.value === 'string' && answer.value.trim().length <= 100 && !answer.value.includes('\n'));
        const details = answers.filter(answer => answer !== primary).map(answerText).filter(Boolean);
        if (home.job === job && extras.has(key)) details.push(`**Additional saved information**\n\n${extras.get(key)}`);
        if (!details.length && !primary?.value) continue;
        const title = `${identity}${primary?.value ? ` — ${String(primary.value)}` : ''}${record._retired || record.retired ? ' [retired]' : ''}`;
        body.push(`${markdownHeading(title, depth + 1)}\n\n${details.join('\n\n')}`.trim());
      }
    }
    return body.length ? `${markdownHeading(job.section.title, depth)}\n\n${body.join('\n\n')}` : '';
  }
  function nodeText(node: MarkdownNode, depth: number): string {
    const sections = node.sections.map(job => sectionText(job, depth + 1)).filter(Boolean);
    if (node.extra) sections.push(`${markdownHeading('Additional saved information', depth + 1)}\n\n${node.extra}`);
    const children = node.children.map(child => nodeText(child, depth + 1)).filter(Boolean);
    if (!sections.length && !children.length) return '';
    const label = node.schema.title || node.schema.label || savedTitle(node.schema.stateKey);
    const title = node.schema.code ? `${node.schema.code} · ${label}` : label;
    return `${markdownHeading(title, depth)}\n\n${[...sections, ...children].join('\n\n')}`;
  }
  const content = nodes.map(node => nodeText(node, 2)).filter(Boolean);
  const other = residual(document, []);
  if (other) content.push(`${markdownHeading('Additional saved workspace information', 2)}\n\n${other}`);
  return `${markdownHeading(metadata.title, 1)}\n\nWorkspace context organized by the application's navigation. Shared saved answers appear once; repeated record IDs identify later additions to the same record. Values may include defaults and do not imply approval. Diagram file metadata is included; XML/image bytes stay in the .dsrs backup.\n\n${metadata.applicationVersion ? `Application version: ${metadata.applicationVersion}\n\n` : ''}${metadata.exportedAt ? `Exported at: ${metadata.exportedAt}\n\n` : ''}${content.join('\n\n') || 'No saved answers yet.'}\n`;
}
