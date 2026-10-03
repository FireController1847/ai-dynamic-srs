import { dataModelForSection } from '../../../core/schema/data-models.js';
import { sectionRecords } from '../../../core/schema/section-records.js';

// Only concrete contradictions. No missing optional-field or review-status homework.
export function authoringFindings(page, local, document) {
  const findings = [];
  for (const section of page.sections || []) {
    if (!section.repeatable) continue;
    const records = sectionRecords(section.repeatable, dataModelForSection(section, local, document));
    if (local[`${section.id}Applicability`] === 'Not applicable' && records.some(item => item.statement?.trim())) {
      findings.push(`${section.title} has saved requirements but is marked Not applicable. Reconcile the entries or the category choice.`);
    }
    if (section.repeatable.dataKey === 'useCases') {
      for (const record of records) {
        if (record.detailLevel === 'Overview sufficient' && record.normalFlow?.trim()) {
          findings.push(`${record.name || 'Use case'} is marked Overview sufficient and has saved detailed steps. Those steps are preserved; choose whether they are still needed.`);
        }
      }
    }
  }
  return [...new Set(findings)];
}
