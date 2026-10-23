import { defineComponent } from 'vue';
import { EvidenceForm, evidenceFormProps } from '../../../components/forms/EvidenceForm.ts';
import { RecordReviewPanel } from '../../../components/references/RecordReviewPanel.ts';
import type { RecordReview } from '../../../core/schema/schema-types.ts';
import { reconciliationModel } from './traceability.ts';
import { reconciliationReview } from './reconciliation-review.ts';

export const ReconciliationStageForm = defineComponent({
  name: 'ReconciliationStageForm',
  components: { EvidenceForm, RecordReviewPanel },
  props: evidenceFormProps,
  emits: ['copy-markdown', 'navigate-workspace'],
  computed: {
    coverage(): ReturnType<typeof reconciliationModel> {
      return reconciliationModel(this.documentModel);
    },
    review(): RecordReview {
      return reconciliationReview(this.pageSchema.id, this.documentModel);
    },
    showMatrix(): boolean {
      return ['srs-reconciliation-coverage', 'srs-reconciliation-verification'].includes(this.pageSchema.id);
    }
  },
  template: `
    <evidence-form
      :page-schema="pageSchema" :data-model="dataModel" :document-model="documentModel"
      :document-schemas="documentSchemas" :copied-section="copiedSection"
      @copy-markdown="$emit('copy-markdown', $event)"
      @navigate-workspace="$emit('navigate-workspace', $event)"
    >
      <template #review>
        <section v-if="showMatrix" class="card border p-3 mb-3" aria-label="Automatically derived coverage and traceability">
          <div class="d-flex align-items-start flex-wrap justify-content-between gap-2 mb-2">
            <div>
              <h3 class="h5 mb-1">Live coverage &amp; traceability</h3>
              <p class="text-body-secondary small mb-0">Derived from existing saved records, not a second editable matrix. Linking an ID does not prove that a use-case path or model is semantically complete.</p>
            </div>
            <span class="badge text-bg-light">{{ coverage.counts.requirements }} active requirements</span>
          </div>
          <p class="small text-body-secondary mb-2">
            {{ coverage.counts.goals }} goals · {{ coverage.counts.cases }} use cases ·
            {{ coverage.counts.figures }} figures ·
            {{ coverage.counts.withCriteria }} acceptance criteria ·
            {{ coverage.counts.withMethods }} verification methods
          </p>
          <div v-if="coverage.requirements.length" class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <caption class="visually-hidden">Live trace from source evidence and goals through use cases and models to requirements and verification plans</caption>
              <thead>
                <tr>
                  <th scope="col">Requirement</th>
                  <th scope="col">Origins / paths</th>
                  <th scope="col">Models</th>
                  <th scope="col">Acceptance &amp; method</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in coverage.requirements" :key="row.id">
                  <th scope="row">
                    <code>{{ row.id }}</code>
                    <div class="small">{{ row.statement || 'Statement missing' }}</div>
                    <span class="small text-body-secondary">{{ row.status }}</span>
                  </th>
                  <td class="small">
                    <div v-if="row.sourceEvidence">Source: {{ row.sourceEvidence }}</div>
                    <div v-if="row.goals.length">Goals: {{ row.goals.join(', ') }}</div>
                    <div v-if="row.actors.length">Actors: {{ row.actors.join(', ') }}</div>
                    <div v-if="row.useCases.length">Cases: {{ row.useCases.join(', ') }}</div>
                    <div v-if="row.paths">Paths: {{ row.paths }}</div>
                    <span v-if="!row.sourceEvidence && !row.useCases.length" class="text-body-secondary">No linked source or use case</span>
                  </td>
                  <td class="small">{{ row.figures.join(', ') || 'No linked figure' }}</td>
                  <td class="small">
                    <div>{{ row.criterion || 'Acceptance criterion missing' }}</div>
                    <span class="text-body-secondary">{{ row.method || 'Method not selected' }} · Plan only</span>
                    <div v-if="row.findings.length" class="mt-1">{{ row.findings.length }} finding(s) to review</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-else class="small text-body-secondary mb-0">No active requirements yet. Complete the canonical requirement register in Phases 3 and 4, then revisit this report.</p>
          <p class="small text-body-secondary mt-2 mb-0">Verification methods and acceptance criteria are plans, not evidence that any test or inspection passed.</p>
        </section>
        <record-review-panel
          :review="review" @navigate-workspace="$emit('navigate-workspace', $event)"
        ></record-review-panel>
      </template>
    </evidence-form>
  `
});
