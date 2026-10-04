import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../../core/schema/schema-types.ts';
import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { EvidenceForm } from "../../../components/forms/EvidenceForm.ts";
import { RecordReviewPanel } from "../../../components/references/RecordReviewPanel.ts";
import { qualityReview } from "./quality-review.ts";

export const QualityStageForm = defineComponent({
  name: "QualityStageForm",
  components: { EvidenceForm, RecordReviewPanel },
  props: EvidenceForm.props,
  emits: ["copy-markdown", "navigate-workspace"],
  computed: { review(): RecordReview { return qualityReview(this.pageSchema.id, this.documentModel); } },
  template: `
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)">
      <template #review><record-review-panel :review="review" @navigate-workspace="$emit('navigate-workspace', $event)"></record-review-panel></template>
    </evidence-form>
  `
});
