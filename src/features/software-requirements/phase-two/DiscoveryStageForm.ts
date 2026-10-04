import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../../core/schema/schema-types.ts';
import { EvidenceForm } from "../../../components/forms/EvidenceForm.ts";
import { discoveryReview } from "./discovery-review.ts";

export const DiscoveryStageForm = defineComponent({
  name: "DiscoveryStageForm",
  components: { EvidenceForm },
  emits: ["copy-markdown", "navigate-workspace"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object as PropType<DataModel>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true }
  },
  computed: {
    review(): RecordReview { return discoveryReview(this.pageSchema.id, this.documentModel); }
  },
  methods: {
    openCatalog(catalog: import("../../../core/schema/schema-types.ts").ReviewCatalog) {
      this.$emit("navigate-workspace", {
        pageId: "software-requirements-specification",
        subpageSelections: {
          "software-requirements-specification": "srs-discover-actors-goals",
          "srs-discover-actors-goals": catalog.stageId
        },
        anchorId: `${catalog.stageId}-${catalog.sectionId}`
      });
    }
  },
  template: `
    <evidence-form
      :page-schema="pageSchema"
      :data-model="dataModel"
      :document-model="documentModel"
      :document-schemas="documentSchemas"
      :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)"
      @navigate-workspace="$emit('navigate-workspace', $event)"
    >
      <template #review>
        <details class="card p-3 mb-4">
          <summary>Reference IDs and coverage review · {{ review.messages.length }} items to review</summary>
          <div class="pt-3">
            <p class="small text-body-secondary">Checks use recorded IDs and dispositions. They help find missing links; they do not certify scope or change form completion. Separate multiple IDs with commas.</p>
            <ul v-if="review.messages.length" class="small">
              <li v-for="message in review.messages" :key="message">{{ message }}</li>
            </ul>
            <p v-else class="small">No link issues detected in the records entered so far. Review business meaning and completeness before proceeding.</p>
            <div v-for="catalog in review.catalogs" :key="catalog.sectionId" class="mt-3">
              <button type="button" class="btn btn-link btn-sm p-0" @click="openCatalog(catalog)">{{ catalog.title }} →</button>
              <ul v-if="catalog.items.length" class="small mt-2">
                <li v-for="item in catalog.items" :key="item.referenceId"><code>{{ item.referenceId }}</code> — {{ item.label }}</li>
              </ul>
              <p v-else class="small text-body-secondary mt-2">No populated records yet.</p>
            </div>
          </div>
        </details>
      </template>
    </evidence-form>
  `
});
