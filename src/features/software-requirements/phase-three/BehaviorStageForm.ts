import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../../core/schema/schema-types.ts';
import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { EvidenceForm } from "../../../components/forms/EvidenceForm.ts";
import { RecordReviewPanel } from "../../../components/references/RecordReviewPanel.ts";
import { behaviorReview } from "./behavior-review.ts";

export const BehaviorStageForm = defineComponent({
  name: "BehaviorStageForm",
  components: { EvidenceForm, RecordReviewPanel },
  emits: ["copy-markdown", "navigate-workspace"],
  props: {
    copiedSection: { type: String, default: "" }, dataModel: { type: Object as PropType<DataModel>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, required: true }, documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true }
  },
  computed: { review(): RecordReview { return behaviorReview(this.pageSchema.id, this.documentModel); } },
  template: `
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)">
      <template #review><record-review-panel :review="review" @navigate-workspace="$emit('navigate-workspace', $event)"></record-review-panel></template>
    </evidence-form>
  `
});
