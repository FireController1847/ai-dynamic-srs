import { records, text, optional } from '../../planning/schema-helpers.ts';
export const oneTimeCostsSection = records('one-time-costs', 'One-time costs', 'Enter the amount, when it is paid, and its supporting estimate.', 'oneTimeCosts', 'CBA-OTC-', 'name', [
  { key: "name", label: "Cost name", type: "text", default: "", columns: "col-md-7", aiHint: "Use a concise cost name tied to a product, service, work package, or implementation activity." },
  { key: "amount", label: "Amount", type: "number", default: "", min: 0, step: "any", columns: "col-md-4", aiHint: "Enter the positive amount in the model currency." },
  { key: "occurrenceYear", label: "When will this cost be paid?", type: "number", default: 0, min: 0, max: 10, step: 1, columns: "col-md-4", aiHint: "Use Year 0 for immediate investment or a later year when the cost is scheduled." },
  { key: 'sourceIds', label: 'Supporting sources', type: 'record-links', default: '', reference: { dataPath: ['costBenefitAnalysis', 'sources'], displayId: { prefix: 'CBA-SRC-', padding: 3 }, labelField: 'item' }, aiHint: 'Select existing evidence records by name; return exact IDs only.' },
  optional(text('assumptions', 'Estimate basis and uncertainty', { placeholder: 'Include quantities, units, exclusions or assumptions needed to understand the estimate. Do not repeat a source citation.' }))
], { itemLabel: 'One-time cost', addLabel: 'Add one-time cost' });
