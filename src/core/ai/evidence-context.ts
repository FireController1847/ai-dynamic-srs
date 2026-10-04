import type { DataModel, Evidence, SchemaNode } from '../schema/schema-types.ts';
import { connectedEvidence, evidenceSectionHasContent } from '../evidence/evidence-model.ts';
import type { EvidenceSection, EvidenceValue } from '../evidence/evidence-model.ts';
import { isGuidedInterviewPrompt } from './interview-prompt.ts';

function markdownValues(values: readonly EvidenceValue[], indent = ''): string {
  return values.map(value => `${indent}- **${value.label}:** ${value.text.replaceAll('\n', `\n${indent}  `)}`).join('\n');
}

function groupMarkdown(group: EvidenceSection): string {
  if (!evidenceSectionHasContent(group)) return '';
  const content = group.repeatable
    ? group.records.map(record => `- **${record.id}**\n${markdownValues(record.values, '  ')}`).join('\n')
    : markdownValues(group.values);
  return `#### ${group.title}\n\n${content}`;
}

export function buildEvidenceContext(evidence: Evidence | undefined, documentModel: DataModel, documentSchemas: readonly SchemaNode[]): string {
  const sources = connectedEvidence(evidence, documentModel, documentSchemas).map(source => {
    const title = [source.schema.code, source.schema.title || source.schema.label].filter(Boolean).join(' — ');
    const groups = source.groups.map(groupMarkdown).filter(Boolean);
    return `### ${title}\n\n${source.reason ? `_Source role: ${source.reason}_\n\n` : ''}${groups.length ? groups.join('\n\n') : '_No populated evidence is recorded in the connected sections._'}`;
  });
  return sources.length
    ? `## Connected workspace evidence\n\nTreat the following as live source context. Preserve its stable IDs, do not ask the user to re-enter it, and call out contradictions instead of silently combining them.\n\n${sources.join('\n\n---\n\n')}`
    : '';
}

export function addEvidenceContextToPrompt(markdown: string, evidence: Evidence | undefined, documentModel: DataModel, documentSchemas: readonly SchemaNode[]) {
  if (isGuidedInterviewPrompt(markdown)) return markdown;
  const context = buildEvidenceContext(evidence, documentModel, documentSchemas);
  const marker = "## Form to complete";

  return context && markdown.includes(marker)
    ? markdown.replace(marker, `${context}\n\n${marker}`)
    : markdown;
}
