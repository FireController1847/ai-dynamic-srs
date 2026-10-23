import { defineComponent } from 'vue';
import { EvidenceForm, evidenceFormProps } from '../../../components/forms/EvidenceForm.ts';
import { RecordReviewPanel } from '../../../components/references/RecordReviewPanel.ts';
import { modelReview } from './model-review.ts';
import type { RecordReview } from '../../../core/schema/schema-types.ts';

export const ModelStageForm=defineComponent({
  name:'ModelStageForm',
  components:{EvidenceForm,RecordReviewPanel},
  props:evidenceFormProps,
  emits:['copy-markdown','navigate-workspace'],
  computed:{
    review():RecordReview {return modelReview(this.pageSchema.id,this.documentModel);}
  },
  template:`
    <evidence-form :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel"
      :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown',$event)" @navigate-workspace="$emit('navigate-workspace',$event)">
      <template #review>
        <record-review-panel :review="review" @navigate-workspace="$emit('navigate-workspace',$event)"></record-review-panel>
      </template>
    </evidence-form>
  `
});
