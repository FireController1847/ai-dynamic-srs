import type { DataModel, DocumentModel, SchemaNode, Field, Section, Repeater, RecordReview, ReviewRecord, ReviewCatalog } from '../../../core/schema/schema-types.ts';
import type { SrsRecords } from '../record-types.ts';
import { srsRecords } from '../record-types.ts';
import { dataModelForSection } from '../../../core/schema/data-models.ts';
import { sectionRecords } from '../../../core/schema/section-records.ts';

// Only concrete contradictions. No missing optional-field or review-status homework.
export function authoringFindings(page: SchemaNode, local: DataModel, document: DocumentModel) {
  const findings = [];
  for (const section of page.sections || []) {
    if (!section.repeatable) continue;
    const records = sectionRecords(section.repeatable, dataModelForSection(section, local, document));
    if (local[`${section.id}Applicability`] === 'Not applicable' && records.some(item => String(item.statement || '').trim())) {
      findings.push(`${section.title} has saved requirements but is marked Not applicable. Reconcile the entries or the category choice.`);
    }
    if (section.repeatable.dataKey === 'useCases') {
      for (const record of records) {
        if (record.detailLevel === 'Overview sufficient' && String(record.normalFlow || '').trim()) {
          findings.push(`${record.name || 'Use case'} is marked Overview sufficient and has saved detailed steps. Those steps are preserved; choose whether they are still needed.`);
        }
      }
    }
  }
  return [...new Set(findings)];
}
