import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const TabCompletionCheck = defineComponent({
  template: `
    <span class="tab-completion-indicator">
      <svg class="tab-completion-check" viewBox="0 0 14 12" aria-hidden="true">
        <path d="M1.5 6.25 5 9.75 12.5 1.75"></path>
      </svg>
      <span class="visually-hidden">Complete</span>
    </span>
  `
});
