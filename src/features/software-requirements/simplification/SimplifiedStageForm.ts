import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../../core/schema/schema-types.ts';
import { authoringFindings } from "./authoring-findings.ts";
import { EvidenceForm } from '../../../components/forms/EvidenceForm.ts';
import { SupportingWork } from './SupportingWork.ts';
export const SimplifiedStageForm = defineComponent({
  props: EvidenceForm.props,
  components: { EvidenceForm, SupportingWork },
  emits: ['copy-markdown', 'navigate-workspace'],
  computed: { findings(): string[] { return authoringFindings(this.pageSchema, this.dataModel, this.documentModel); } },
  template: `<div><supporting-work :document-model="documentModel" :show-questions="pageSchema.id !== 'srs-baseline-evidence-intake'"></supporting-work>
    <ul v-if="findings.length" class="small"><li v-for="finding in findings" :key="finding">{{ finding }}</li></ul>
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)"></evidence-form></div>`
});
