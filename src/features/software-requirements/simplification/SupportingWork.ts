import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../../core/schema/schema-types.ts';
export const SupportingWork = defineComponent({
  props: { showQuestions: { type: Boolean, default: true }, documentModel: { type: Object as PropType<DocumentModel>, required: true } },
  data() { return { question: '' }; },
  computed: {
    srs(): import("../record-types.ts").SrsRecords { return this.documentModel.softwareRequirementsSpecification; },
    issues(): DataModel[] { return (this.srs.records.evidenceIssues || []).filter(item => !item._retired && !item.retired && !['Resolved', 'Accepted exception'].includes(String(item.status))); },
    openCount(): number { return this.issues.filter(item => !['Resolved', 'Accepted exception'].includes(String(item.status))).length; }
  },
  methods: {
    add() {
      if (!this.question.trim()) return;
      const items = this.srs.records.evidenceIssues;
      items.push({ id: Math.max(0, ...items.map(item => Number(item.id) || 0)) + 1, description: this.question.trim(), status: 'Open', resolution: '' });
      this.question = '';
    }
  },
  template: `<aside class="mb-4">
    <details v-if="showQuestions" class="card p-3">
      <summary>Shared questions ({{ openCount }} open)</summary>
      <p class="small mt-2">Record a question once. Resolve it here and update the affected answer when it becomes clear.</p>
      <div v-for="item in issues" :key="item.id" class="border-top py-2">
        <label class="form-label d-block">Question {{ item.id }}<textarea class="form-control" rows="2" v-model="item.description"></textarea></label>
        <label class="form-label d-block">Answer or next action<textarea class="form-control" rows="2" v-model="item.resolution"></textarea></label>
        <label class="form-label">Status<select class="form-select" v-model="item.status"><option>Open</option><option>Under review</option><option>Resolved</option><option>Accepted exception</option></select></label>
        <p v-if="item.additionalDetails" class="small preserve-lines">{{ item.additionalDetails }}</p>
      </div>
      <label class="form-label d-block mt-2">New question<textarea class="form-control" rows="2" v-model="question"></textarea></label>
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="add">Add question</button>
    </details>
  </aside>`
});
