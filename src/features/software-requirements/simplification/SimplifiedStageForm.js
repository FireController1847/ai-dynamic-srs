import { authoringFindings } from "./authoring-findings.js";
import { EvidenceForm } from '../../../components/forms/EvidenceForm.js';
import { SupportingWork } from './SupportingWork.js';
export const SimplifiedStageForm = {
  props: EvidenceForm.props,
  components: { EvidenceForm, SupportingWork },
  emits: ['copy-markdown', 'navigate-workspace'],
  computed: { findings() { return authoringFindings(this.pageSchema, this.dataModel, this.documentModel); } },
  template: `<div><supporting-work :document-model="documentModel" :show-questions="pageSchema.id !== 'srs-baseline-evidence-intake'"></supporting-work>
    <ul v-if="findings.length" class="small"><li v-for="finding in findings" :key="finding">{{ finding }}</li></ul>
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)"></evidence-form></div>`
};
