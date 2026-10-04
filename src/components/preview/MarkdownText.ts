import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { renderMarkdown } from '../../core/formatting/markdown.ts';
export const MarkdownText = defineComponent({
  props: { value: { type: null as unknown as PropType<unknown>, default: '' } },
  computed: { html(): string { return renderMarkdown(this.value); } },
  // Only the escaped, allowlisted output of our renderer enters v-html.
  template: '<div class="document-markdown" v-html="html"></div>'
});
