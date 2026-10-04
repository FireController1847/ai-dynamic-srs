import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const RecordReviewPanel = defineComponent({
  name: "RecordReviewPanel",
  emits: ["navigate-workspace"],
  props: { review: { type: Object as PropType<RecordReview>, required: true } },
  template: `
    <details class="card p-3 mb-4">
      <summary>Reference IDs and consistency review · {{ review.messages.length }} items to review</summary>
      <div class="pt-3">
        <p class="small text-body-secondary">Checks use recorded IDs and dispositions. They do not inspect diagram contents, approve decisions, or change completion percentages. Separate multiple IDs with commas.</p>
        <ul v-if="review.messages.length" class="small"><li v-for="message in review.messages" :key="message">{{ message }}</li></ul>
        <p v-else class="small">No structural issues detected in the records entered so far. Review meaning and completeness before proceeding.</p>
        <div v-for="catalog in review.catalogs" :key="catalog.title" class="mt-3">
          <button class="btn btn-link btn-sm p-0" type="button" @click="$emit('navigate-workspace', catalog.target)">{{ catalog.title }} →</button>
          <ul v-if="catalog.items.length" class="small mt-2"><li v-for="item in catalog.items" :key="item.referenceId"><code>{{ item.referenceId }}</code> — {{ item.label }}</li></ul>
          <p v-else class="small text-body-secondary mt-2">No populated records yet.</p>
        </div>
      </div>
    </details>
  `
});
