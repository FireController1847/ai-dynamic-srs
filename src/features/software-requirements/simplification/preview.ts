import type { DataModel, Field, SchemaNode } from "../../../core/schema/schema-types.ts";

export interface BaselinePreviewModel { data: DataModel; page: SchemaNode; }

// Phase 1 has explicit document placement; keep its carried source content,
// while removing retired questionnaires from the rendered specification.
const recordKeys: Record<string, readonly string[]> = {
  audiences: ['nameOrGroup', 'additionalDetails'],
  terms: ['term', 'definition', 'usageNotes', 'additionalDetails'],
  evidenceIssues: ['description', 'status', 'affectedReferences', 'resolution', 'additionalDetails'],
  scopeDecisions: ['statement', 'decisionType', 'status', 'sourceReferences', 'additionalDetails'],
  sourceReferences: ['sourceTitle', 'sourceVersion', 'baselineUse'],
  productFeatures: ['statement', 'priority']
};
const retiredSections = new Set(['preview-reference-baseline', 'preview-vocabulary-review']);
const retiredFields = new Set(['scopeDisposition', 'scopeReconciliation', 'capabilityAlignment', 'capabilityAlignmentNotes']);
const field = (key: string, label: string): Field => ({ key, label, type: 'textarea' });
export function simplifyBaselinePreview(model: BaselinePreviewModel): BaselinePreviewModel {
  const sections = (model.page.sections || []).filter(section => !retiredSections.has(section.id)).map(section => {
    if (section.repeatable && recordKeys[section.repeatable.dataKey]) {
      const allowed = recordKeys[section.repeatable.dataKey];
      const fields = section.repeatable.fields.filter(f => allowed.includes(f.key));
      if (allowed.includes('additionalDetails')) fields.push(field('additionalDetails', 'Additional details'));
      if (allowed.includes('affectedReferences') && !fields.some(f => f.key === 'affectedReferences')) fields.push(field('affectedReferences', 'Affected records'));
      return { ...section, repeatable: { ...section.repeatable, fields } };
    }
    if (section.id === 'preview-product-perspective') return {
      ...section, fields: [field(model.data.productPerspective ? 'productPerspective' : 'perspectiveEvidence', 'Product context')]
    };
    return { ...section, fields: section.fields?.filter(f => !retiredFields.has(f.key)) };
  });
  return { ...model, page: { ...model.page, omitEmptyFields: true, sections } };
}
