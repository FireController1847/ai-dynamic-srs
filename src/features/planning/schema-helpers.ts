import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
// Declarative building blocks for the four project-planning documents.
import { planningGuides, planningSectionHelp } from './help-content.ts';
export const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: 'textarea', rows: 2, default: '', ...extra });
export const short = (key: string, label: string, extra: Partial<Field> = {}): Field => text(key, label, { type: 'text', columns: 'col-md-6', ...extra });
export const choice = (key: string, label: string, options: FieldOption[], extra: Partial<Field> = {}): Field => ({ key, label, type: 'select', default: '', placeholder: 'Choose when known', options, columns: 'col-md-6', ...extra });
export const optional = (field: Field): Field => ({ ...field, optional: true, completion: false });
export const section = (id: string, title: string, description: string, fields: Field[] | undefined, extra: Partial<Section> = {}): Section => ({
  id, key: id, title, description, fields,
  help: planningSectionHelp[id] || description, ...extra
});
export function records(id: string, title: string, description: string, dataKey: string, prefix: string, primaryField: string, fields: Field[], extra: Partial<Repeater> = {}): Section {
  return section(id, title, description, undefined, { repeatable: {
    dataKey, itemLabel: title, addLabel: 'Add entry', minimum: 0, stableIds: true,
    displayId: { prefix, padding: 3 }, primaryField, previewStyle: 'list',
    completionFields: [primaryField], completionMode: 'all-required', fields, ...extra
  } });
}
export const metadata = (dateKey: string, dateDocument: string): Field[] => [
  optional(short('preparedBy', 'Prepared by')),
  optional(short(dateKey, dateKey === 'analysisDate' ? 'Analysis date' : dateKey === 'requestDate' ? 'Request date' : 'Preparation date', { type: 'date', dateDocument })),
  optional(short('version', 'Document version', { default: '0.1' }))
];
export const source = (pageId: string, sectionIds: string[]): EvidenceSource => ({ pageId, reason: 'Established upstream answers supporting this document.', groups: sectionIds.map(sectionId => ({ sectionId })) });
export const guide = (title: string, terms: AiDefinition[] = []): Guide => ({ ...planningGuides[title], terms });
export const ai = (task: string, definitions: AiDefinition[] = [], guidance: Pick<AiGuidance, 'interviewGuidance' | 'draftingGuidance'> = {}): AiGuidance => ({ task, showInterview: true, definitions, ...guidance });
