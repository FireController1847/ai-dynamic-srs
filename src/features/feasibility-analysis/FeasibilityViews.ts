import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { EvidenceForm, evidenceFormProps } from '../../components/forms/EvidenceForm.ts';
import { DocumentPreview, documentPreviewProps } from '../../components/preview/DocumentPreview.ts';
import { financialEvidence } from '../cost-benefit-analysis/financial-evidence.ts';
export const FeasibilityForm = defineComponent({
  props: evidenceFormProps, components: { EvidenceForm }, emits: ['copy-markdown', 'navigate-workspace'],
  computed: { financials(): string { return financialEvidence(this.documentModel.costBenefitAnalysis); } },
  template: `<div><details class="card p-3 mb-3"><summary>Live CBA results</summary><p class="preserve-lines mt-2 mb-0">{{ financials }}</p></details>
    <evidence-form v-bind="$props" @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)"></evidence-form></div>`
});
export const FeasibilityPreview = defineComponent({
  props: documentPreviewProps, components: { DocumentPreview }, emits: ['print'],
  computed: {
    previewData(): DataModel { return { ...this.dataModel, calculatedFinancials: financialEvidence(this.documentModel.costBenefitAnalysis) }; },
    previewSchema(): SchemaNode {
      return { ...this.pageSchema, sections: (this.pageSchema.sections || []).map((section: Section) => section.id === 'economic-feasibility'
        ? { ...section, fields: [{ key: 'calculatedFinancials', label: 'Calculated CBA results', type: 'textarea' }, ...(section.fields || [])] } : section) };
    }
  },
  template: `<document-preview v-bind="$props" :page-schema="previewSchema" :data-model="previewData" @print="$emit('print', $event)"></document-preview>`
});
