import { defineComponent } from 'vue';
import { evidenceFormProps } from '../../../components/forms/EvidenceForm.ts';
import type { DataModel } from '../../../core/schema/schema-types.ts';
import { createWorkspaceSnapshot } from '../../../core/workspace/workspace-format.ts';
import { downloadWorkspaceJson } from '../../../core/workspace/workspace-files.ts';
import {
  applyCleanup, cleanupPreview, cleanupPrompt, cleanupSourceHash, planCleanup
} from './ai-cleanup.ts';
import type { CleanupPlan } from './ai-cleanup.ts';

/** Full JSON review/edit flow. No schema sections or user-entered completion fields. */
export const AiCleanupStageForm = defineComponent({
  name: 'AiCleanupStageForm',
  props: evidenceFormProps,
  emits: ['copy-markdown'],
  data() {
    return {
      responseText: '',
      validatedResponse: '',
      validatedHash: '',
      plan: null as CleanupPlan | null,
      selectedIndices: [] as number[],
      error: '',
      success: '',
      undoData: null as DataModel | null,
      undoHash: ''
    };
  },
  computed: {
    sourceHash(): string {
      return cleanupSourceHash(this.documentModel);
    },
    allSelected(): boolean {
      return !!this.plan?.changes.length && this.selectedIndices.length === this.plan.changes.length;
    }
  },
  methods: {
    copyPrompt() {
      this.$emit('copy-markdown', {
        markdown: cleanupPrompt(this.documentModel),
        title: 'Full-workspace AI cleanup instructions',
        key: 'srs-reconciliation-cleanup:full-json'
      });
    },
    downloadJson() {
      try {
        const snapshot = createWorkspaceSnapshot({
          projectContext: this.documentModel.clientRequirements || {},
          sections: this.documentModel
        });
        downloadWorkspaceJson(snapshot);
        this.error = '';
        this.success = 'Full workspace JSON exported. Attach this file with the copied instructions to ChatGPT.';
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      }
    },
    onInput(value: string) {
      this.responseText = value;
      this.plan = null;
      this.validatedResponse = '';
      this.validatedHash = '';
      this.selectedIndices = [];
      this.error = '';
      this.success = '';
    },
    validate() {
      try {
        const plan = planCleanup(this.documentModel, this.documentSchemas, this.responseText);
        this.plan = plan;
        this.selectedIndices = plan.changes.map(change => change.index);
        this.validatedResponse = this.responseText;
        this.validatedHash = this.sourceHash;
        this.error = '';
        this.success = '';
      } catch (error) {
        this.plan = null;
        this.selectedIndices = [];
        this.validatedResponse = '';
        this.validatedHash = '';
        this.error = error instanceof Error ? error.message : String(error);
      }
    },
    toggleAll() {
      if (!this.plan) return;
      this.selectedIndices = this.allSelected ? [] : this.plan.changes.map(change => change.index);
    },
    preview(value: unknown): string {
      return cleanupPreview(value);
    },
    async applySelected() {
      if (!this.plan || this.responseText !== this.validatedResponse
        || this.sourceHash !== this.validatedHash || !this.selectedIndices.length) {
        this.error = 'The source or response changed. Validate again before applying.';
        return;
      }
      try {
        const selection = [...this.selectedIndices].sort((a, b) => a - b);
        const finalPlan = planCleanup(this.documentModel, this.documentSchemas, this.responseText, selection);
        const previous = JSON.parse(JSON.stringify(this.documentModel.softwareRequirementsSpecification || {})) as DataModel;
        applyCleanup(this.documentModel, finalPlan);
        this.undoData = previous;
        // Let the app's document-date watcher update its derived modification stamp first.
        await this.$nextTick();
        this.undoHash = this.sourceHash;
        this.plan = null;
        this.selectedIndices = [];
        this.responseText = '';
        this.validatedResponse = '';
        this.validatedHash = '';
        this.error = '';
        this.success = 'Applied ' + finalPlan.changes.length + ' approved changes to the saved SRS Phases 1–6. Undo is available here until another edit is made.';
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      }
    },
    undo() {
      if (!this.undoData || this.sourceHash !== this.undoHash) {
        this.error = 'The workspace has changed since cleanup. Undo is no longer safe; restore an earlier WIP backup if needed.';
        return;
      }
      this.documentModel.softwareRequirementsSpecification = this.undoData;
      this.undoData = null;
      this.undoHash = '';
      this.success = 'Reverted the last AI cleanup changeset.';
      this.error = '';
    }
  },
  template: `
    <section class="card border-0 shadow-sm mb-4" aria-labelledby="ai-cleanup-title">
      <div class="card-body p-4">
        <p class="section-kicker mb-2">Phase 6 · Step 5 · Optional</p>
        <h3 id="ai-cleanup-title" class="h5">Full-workspace AI cleanup</h3>
        <p class="text-body-secondary">Give ChatGPT your complete saved Dynamic SRS JSON. It can review and propose improvements anywhere across SRS Phases 1–6, including shared records, relationships, requirements and model metadata. It returns <strong>changes only</strong> rather than a rewritten workspace.</p>
        <p class="small text-body-secondary">This is optional and does not affect phase completion. The exported JSON can contain project-sensitive information; review what you share with an external AI.</p>
        <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
          <button type="button" class="btn btn-outline-primary" @click="downloadJson">1. Download full workspace JSON</button>
          <button type="button" class="btn btn-primary" @click="copyPrompt">2. Copy AI cleanup instructions</button>
        </div>
        <p class="small text-body-secondary">Attach the exported .json file and paste the copied instructions into ChatGPT. Both must come from the same saved workspace version. Your existing .dsrs backup remains unchanged.</p>

        <label class="form-label" for="ai-cleanup-json">3. Paste the changes-only JSON returned by ChatGPT</label>
        <textarea id="ai-cleanup-json" class="form-control ai-form-import-input" rows="9"
          :value="responseText" spellcheck="false"
          placeholder='{"format":"dsrs-cleanup","version":2,"baseHash":"...","changes":[]}'
          @input="onInput($event.target.value)"
        ></textarea>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button type="button" class="btn btn-outline-primary" :disabled="!responseText.trim()" @click="validate">4. Validate and review changes</button>
          <button v-if="undoData" type="button" class="btn btn-outline-secondary" :disabled="sourceHash !== undoHash" @click="undo">Undo last cleanup</button>
        </div>
        <p v-if="error" class="small text-danger mt-3" role="alert">{{ error }}</p>
        <p v-if="success" class="small text-body-secondary mt-3" role="status">{{ success }}</p>

        <section v-if="plan" class="mt-4" aria-label="Proposed full-workspace changes">
          <div class="d-flex flex-wrap justify-content-between gap-2 align-items-center">
            <h4 class="h6 mb-0">{{ plan.changes.length }} proposed changes</h4>
            <button v-if="plan.changes.length" type="button" class="btn btn-outline-secondary btn-sm" @click="toggleAll">{{ allSelected ? 'Deselect all' : 'Select all' }}</button>
          </div>
          <p class="small text-body-secondary mt-2">All operations were validated together against a detached copy of the current workspace. Review the before/after values and reasons. Record IDs, approvals, figures, model links and requirements may be changed by selected operations; check their downstream impacts. Deselecting dependent operations can make the remaining changeset invalid.</p>
          <p v-if="!plan.changes.length" class="small text-body-secondary">No changes proposed. Your workspace is untouched.</p>
          <div v-for="change in plan.changes" :key="change.index" class="card border mb-3">
            <div class="card-body">
              <label class="d-flex gap-2 align-items-start">
                <input type="checkbox" class="form-check-input mt-1" :value="change.index" v-model="selectedIndices" />
                <span><strong>{{ change.op.toUpperCase() }} · {{ change.path }}</strong><span v-if="change.reason" class="d-block small text-body-secondary">{{ change.reason }}</span></span>
              </label>
              <div class="row g-3 mt-2">
                <div class="col-md-6">
                  <p class="small fw-semibold mb-1">Before</p>
                  <pre class="small text-wrap mb-0">{{ preview(change.previous) }}</pre>
                </div>
                <div class="col-md-6">
                  <p class="small fw-semibold mb-1">After</p>
                  <pre class="small text-wrap mb-0">{{ change.op === 'remove' ? '(removed)' : preview(change.value) }}</pre>
                </div>
              </div>
            </div>
          </div>
          <button v-if="plan.changes.length" type="button" class="btn btn-primary"
            :disabled="!selectedIndices.length || sourceHash !== validatedHash"
            @click="applySelected">5. Apply {{ selectedIndices.length }} selected changes</button>
        </section>
      </div>
    </section>
  `
});
