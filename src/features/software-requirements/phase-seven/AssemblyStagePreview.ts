import { defineComponent } from 'vue';
import { documentPreviewProps, DocumentPreview } from '../../../components/preview/DocumentPreview.ts';
import { assembleSrs } from './assembly-model.ts';

export const AssemblyStagePreview = defineComponent({
  name:'AssemblyStagePreview',
  inheritAttrs:false,
  components:{DocumentPreview},
  props:documentPreviewProps,
  emits:['print'],
  computed:{
    assembly():ReturnType<typeof assembleSrs> {
      return assembleSrs(this.documentModel,this.documentSchemas,this.projectContext);
    }
  },
  template:`
    <div class="srs-assembly-preview">
      <p class="small text-body-secondary mb-2">
        Complete SRS in finished-document order. Drafts and unresolved findings remain identifiable;
        printing an unapproved document does not change its status.
      </p>
      <document-preview
        :page-schema="assembly.page" :data-model="assembly.data"
        :document-config="documentConfig" :document-model="documentModel"
        :project-context="projectContext" :print-date-label="printDateLabel"
        :print-page-id="printPageId" :is-printing="isPrinting"
        :partial="false"
        @print="$emit('print',$event)">
      </document-preview>
    </div>
  `
});
