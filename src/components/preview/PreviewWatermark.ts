import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const PreviewWatermark = defineComponent({
  props: {
    isPartial: { type: Boolean, default: false },
    isPrinting: { type: Boolean, default: false }
  },
  computed: {
    label(): string {
      return this.isPrinting && this.isPartial ? "PARTIAL" : "PREVIEW";
    },
    visible(): boolean {
      return !this.isPrinting || this.isPartial;
    }
  },
  template: `
    <div v-if="visible" class="document-watermark" aria-hidden="true">{{ label }}</div>
  `
});
