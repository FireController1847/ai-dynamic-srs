import { EvidenceForm } from "../../../components/forms/EvidenceForm.js";
import { RecordReviewPanel } from "../../../components/references/RecordReviewPanel.js";
import { qualityReview } from "./quality-review.js";

export const QualityStageForm = {
  name: "QualityStageForm",
  components: { EvidenceForm, RecordReviewPanel },
  props: EvidenceForm.props,
  emits: ["copy-markdown", "navigate-workspace"],
  computed: { review() { return qualityReview(this.pageSchema.id, this.documentModel); } },
  template: `
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)">
      <template #review><record-review-panel :review="review" @navigate-workspace="$emit('navigate-workspace', $event)"></record-review-panel></template>
    </evidence-form>
  `
};
