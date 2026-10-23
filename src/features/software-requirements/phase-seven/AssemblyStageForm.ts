import { defineComponent } from 'vue';
import { EvidenceForm, evidenceFormProps } from '../../../components/forms/EvidenceForm.ts';
import { assembleSrs } from './assembly-model.ts';

export const AssemblyStageForm = defineComponent({
  name:'AssemblyStageForm',
  components:{EvidenceForm},
  props:evidenceFormProps,
  emits:['copy-markdown','navigate-workspace'],
  computed:{
    assembly():ReturnType<typeof assembleSrs> {
      return assembleSrs(this.documentModel,this.documentSchemas);
    }
  },
  template:`
    <evidence-form
      :page-schema="pageSchema" :data-model="dataModel"
      :document-model="documentModel" :document-schemas="documentSchemas"
      :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown',$event)"
      @navigate-workspace="$emit('navigate-workspace',$event)">
      <template #review>
        <section class="card border p-3 mb-3" aria-label="Assembled SRS readiness">
          <h3 class="h5 mb-1">Live assembly status</h3>
          <p class="text-body-secondary mb-2">
            {{ assembly.counts.sections }} populated outline sections ·
            {{ assembly.counts.entries }} entries ·
            {{ assembly.counts.figures }} embedded figures ·
            {{ assembly.counts.sources }} embedded source documents
          </p>
          <p class="mb-2"><strong>{{ assembly.status }}</strong></p>
          <p class="small text-body-secondary">
            This is a live document projection. Canonical requirements, issues, figures and source records remain editable only at their original locations.
            A completed form or selected verification method is not evidence of approval or executed testing.
          </p>
          <details v-if="assembly.findings.length" class="mt-2">
            <summary>{{ assembly.findings.length }} outstanding assembly or source findings</summary>
            <ul class="mt-2 mb-0">
              <li v-for="(finding,index) in assembly.findings.slice(0,40)" :key="index">{{ finding }}</li>
              <li v-if="assembly.findings.length > 40">Additional findings remain. Review earlier phases for the full list.</li>
            </ul>
          </details>
          <p v-else class="small mb-0">No structural findings were detected. Visual correctness and semantic approval remain human judgments.</p>
          <details v-if="assembly.excluded.length" class="mt-2">
            <summary>{{ assembly.excluded.length }} excluded or deferred records (retained in the workspace)</summary>
            <ul class="mt-2 mb-0"><li v-for="(entry,index) in assembly.excluded" :key="index">{{ entry }}</li></ul>
          </details>
        </section>
      </template>
    </evidence-form>
  `
});
