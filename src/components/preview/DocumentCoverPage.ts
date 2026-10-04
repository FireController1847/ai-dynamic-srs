import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const DocumentCoverPage = defineComponent({
  props: {
    documentCode: { type: String, default: "" },
    documentName: { type: String, required: true },
    metadataEntries: { type: Array as PropType<MetadataEntry[]>, default: () => [] },
    projectTitle: { type: String, default: "" }
  },
  template: `
    <section class="document-cover-page" aria-label="Document cover page">
      <div class="document-cover-heading">
        <p v-if="documentCode" class="document-cover-code">{{ documentCode }}</p>
        <h1>{{ documentName }}</h1>
        <p class="document-cover-for">for</p>
        <h2>{{ projectTitle || "Untitled Project" }}</h2>
      </div>

      <dl v-if="metadataEntries.length" class="document-cover-meta">
        <div v-for="item in metadataEntries" :key="item.key">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
    </section>
  `
});
