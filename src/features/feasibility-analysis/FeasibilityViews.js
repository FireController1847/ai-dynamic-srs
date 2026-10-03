import { EvidenceForm } from '../../components/forms/EvidenceForm.js';
import { DocumentPreview } from '../../components/preview/DocumentPreview.js';
import { financialEvidence } from '../cost-benefit-analysis/financial-evidence.js';
export const FeasibilityForm = {
  props: EvidenceForm.props, components: { EvidenceForm }, emits: ['copy-markdown', 'navigate-workspace'],
  computed: { financials() { return financialEvidence(this.documentModel.costBenefitAnalysis); } },
  template: `<div><details class="card p-3 mb-3"><summary>Live CBA results</summary><p class="preserve-lines mt-2 mb-0">{{ financials }}</p></details>
    <evidence-form v-bind="$props" @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)"></evidence-form></div>`
};
export const FeasibilityPreview = {
  props: DocumentPreview.props, components: { DocumentPreview }, emits: ['print'],
  computed: {
    previewData() { return { ...this.dataModel, calculatedFinancials: financialEvidence(this.documentModel.costBenefitAnalysis) }; },
    previewSchema() {
      return { ...this.pageSchema, sections: this.pageSchema.sections.map(section => section.id === 'economic-feasibility'
        ? { ...section, fields: [{ key: 'calculatedFinancials', label: 'Calculated CBA results', type: 'textarea' }, ...section.fields] } : section) };
    }
  },
  template: `<document-preview v-bind="$props" :page-schema="previewSchema" :data-model="previewData" @print="$emit('print', $event)"></document-preview>`
};
