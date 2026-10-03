// Declarative building blocks for the four project-planning documents.
import { planningGuides, planningSectionHelp } from './help-content.js';
export const text = (key, label, extra = {}) => ({ key, label, type: 'textarea', rows: 2, default: '', ...extra });
export const short = (key, label, extra = {}) => text(key, label, { type: 'text', columns: 'col-md-6', ...extra });
export const choice = (key, label, options, extra = {}) => ({ key, label, type: 'select', default: '', placeholder: 'Choose when known', options, columns: 'col-md-6', ...extra });
export const optional = field => ({ ...field, optional: true, completion: false });
export const section = (id, title, description, fields, extra = {}) => ({
  id, key: id, title, description, fields,
  help: planningSectionHelp[id] || description, ...extra
});
export function records(id, title, description, dataKey, prefix, primaryField, fields, extra = {}) {
  return section(id, title, description, undefined, { repeatable: {
    dataKey, itemLabel: title, addLabel: 'Add entry', minimum: 0, stableIds: true,
    displayId: { prefix, padding: 3 }, primaryField, previewStyle: 'list',
    completionFields: [primaryField], completionMode: 'all-required', fields, ...extra
  } });
}
export const metadata = (dateKey, dateDocument) => [
  optional(short('preparedBy', 'Prepared by')),
  optional(short(dateKey, dateKey === 'analysisDate' ? 'Analysis date' : dateKey === 'requestDate' ? 'Request date' : 'Preparation date', { type: 'date', dateDocument })),
  optional(short('version', 'Document version', { default: '0.1' }))
];
export const source = (pageId, sectionIds) => ({ pageId, reason: 'Reuse the existing answers; ask only about gaps affecting this document.', groups: sectionIds.map(sectionId => ({ sectionId })) });
export const guide = (title, terms = []) => ({ ...planningGuides[title], terms });
export const ai = (task, definitions = []) => ({ task, compactInterview: true, draftingGuidance: task, definitions });
