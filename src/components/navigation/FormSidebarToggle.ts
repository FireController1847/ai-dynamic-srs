import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const FormSidebarToggle = defineComponent({
  name: "FormSidebarToggle",
  emits: ["toggle"],
  props: {
    visible: { type: Boolean, required: true }
  },
  template: `
    <button
      class="btn btn-sm workspace-utility-button form-sidebar-toggle"
      :class="visible ? 'form-sidebar-hide' : 'form-sidebar-show'"
      type="button"
      :aria-expanded="visible"
      :aria-label="visible ? 'Hide the form progress menu' : 'Show the form progress menu'"
      @click="$emit('toggle', !visible)"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path v-if="visible" d="M10 3 5 8l5 5"></path>
        <path v-else d="m6 3 5 5-5 5"></path>
      </svg>
      <span>{{ visible ? 'Hide' : 'Show progress' }}</span>
    </button>
  `
});
