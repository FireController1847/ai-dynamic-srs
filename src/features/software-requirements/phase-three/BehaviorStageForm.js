import { EvidenceForm } from "../../../components/forms/EvidenceForm.js";
import { RecordReviewPanel } from "../../../components/references/RecordReviewPanel.js";
import { behaviorReview } from "./behavior-review.js";

export const BehaviorStageForm = {
  name: "BehaviorStageForm",
  components: { EvidenceForm, RecordReviewPanel },
  emits: ["copy-markdown", "navigate-workspace"],
  props: {
    copiedSection: { type: String, default: "" }, dataModel: { type: Object, required: true },
    documentModel: { type: Object, required: true }, documentSchemas: { type: Array, required: true },
    pageSchema: { type: Object, required: true }
  },
  computed: { review() { return behaviorReview(this.pageSchema.id, this.documentModel); } },
  template: `
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)" @navigate-workspace="$emit('navigate-workspace', $event)">
      <template #review><record-review-panel :review="review" @navigate-workspace="$emit('navigate-workspace', $event)"></record-review-panel></template>
    </evidence-form>
  `
};
