import { defineComponent } from 'vue';
import { evidenceFormProps } from '../../../components/forms/EvidenceForm.ts';
import type { CleanupChange } from './ai-cleanup.ts';
import { applyCleanup, buildCleanupPrompt, cleanupCandidates, planCleanup } from './ai-cleanup.ts';

/** Deliberately separate from dsrs-form: this edits many established narrative fields at once. */
export const AiCleanupStageForm = defineComponent({
  name: 'AiCleanupStageForm',
  props: evidenceFormProps,
  emits: ['copy-markdown'],
  data() {
    return {
      responseText: '',
      validatedText: '',
      suggestions: null as CleanupChange[] | null,
      selectedIds: [] as string[],
      error: '',
      success: ''
    };
  },
  computed: {
    targetCount(): number {
      return cleanupCandidates(this.documentSchemas, this.documentModel).length;
    }
  },
  methods: {
    copyPrompt() {
      this.$emit('copy-markdown', {
        markdown: buildCleanupPrompt(this.documentSchemas, this.documentModel),
        title: 'Optional SRS AI cleanup',
        key: 'srs-reconciliation-cleanup:editorial'
      });
    },
    invalidate() {
      this.suggestions = null;
      this.selectedIds = [];
      this.validatedText = '';
      this.error = '';
      this.success = '';
    },
    updateResponse(value: string) {
      this.responseText = value;
      this.invalidate();
    },
    validate() {
      try {
        this.suggestions = planCleanup(this.documentSchemas, this.documentModel, this.responseText);
        this.validatedText = this.responseText;
        this.selectedIds = [];
        this.error = '';
        this.success = '';
      } catch (error) {
        this.invalidate();
        this.error = error instanceof Error ? error.message : String(error);
      }
    },
    applySelected() {
      if (!this.suggestions || this.validatedText !== this.responseText || !this.selectedIds.length) {
        this.error = 'Validate this response and select the proposed edits to apply.';
        return;
      }
      try {
        // Revalidate against all live fields: old copied prompts cannot silently overwrite later edits.
        const current = planCleanup(this.documentSchemas, this.documentModel, this.responseText);
        const selected = new Set(this.selectedIds);
        const count = applyCleanup(this.documentModel, current.filter(change => selected.has(change.id)));
        this.invalidate();
        this.responseText = '';
        this.success = `Applied ${count} reviewed narrative ${count === 1 ? 'edit' : 'edits'} to the original SRS fields.`;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        this.suggestions = null;
        this.selectedIds = [];
        this.validatedText = '';
      }
    }
  },
  template: `
    <section class="card border-0 shadow-sm mb-4" aria-labelledby="ai-cleanup-title">
      <div class="card-body p-4">
        <p class="section-kicker mb-2">Phase 6 · Step 5 · Optional</p>
        <h3 id="ai-cleanup-title" class="h5">AI editorial cleanup</h3>
        <p class="text-body-secondary">Review saved project evidence for repeated explanations and wordy SRS descriptions before Phase 7 assembles the final document. Skipping this step does not affect completion or the specification.</p>
        <p class="small text-body-secondary">Only existing, editable SRS narrative fields are eligible ({{ targetCount }} currently populated). IDs, links, requirements data types, statuses, diagram files and other documents are not direct edit targets.</p>

        <div class="d-flex flex-wrap align-items-center gap-3 mb-3">
          <button type="button" class="btn btn-primary" @click="copyPrompt">Copy AI cleanup prompt</button>
          <span class="small text-body-secondary">1. Paste into ChatGPT. 2. Paste its JSON below. 3. Review and select edits.</span>
        </div>

        <label class="form-label" for="ai-cleanup-json">AI cleanup response</label>
        <textarea id="ai-cleanup-json" class="form-control ai-form-import-input" rows="8"
          :value="responseText" spellcheck="false"
          placeholder='{"format":"dsrs-cleanup","version":1,"edits":[]}'
          @input="updateResponse($event.target.value)"
        ></textarea>
        <div class="d-flex flex-wrap align-items-center gap-2 mt-3">
          <button type="button" class="btn btn-outline-primary" :disabled="!responseText.trim()" @click="validate">Validate suggestions</button>
          <span class="small text-body-secondary">Validation makes no changes. Only explicitly selected replacements are applied.</span>
        </div>
        <p v-if="error" class="ai-form-import-error mt-3" role="alert">{{ error }}</p>
        <p v-if="success" class="small mt-3" role="status">{{ success }}</p>

        <section v-if="suggestions" class="mt-4" aria-label="Proposed editorial replacements">
          <h4 class="h6">Review {{ suggestions.length }} proposed {{ suggestions.length === 1 ? 'edit' : 'edits' }}</h4>
          <p v-if="!suggestions.length" class="small text-body-secondary">No safe improvements suggested. Nothing to apply.</p>
          <p v-else class="small text-body-secondary">Read each before/after comparison. Select only revisions that retain every important fact, qualification and acceptance condition.</p>
          <div v-for="change in suggestions" :key="change.id" class="card border mb-3">
            <div class="card-body">
              <label class="d-flex gap-2 align-items-start">
                <input type="checkbox" class="form-check-input mt-1" :value="change.id" v-model="selectedIds" />
                <span><strong>{{ change.label }}</strong><span class="small text-body-secondary"> — select to apply</span></span>
              </label>
              <div class="row g-3 mt-1">
                <div class="col-md-6">
                  <p class="small fw-semibold mb-1">Current text</p>
                  <pre class="small text-wrap mb-0">{{ change.original }}</pre>
                </div>
                <div class="col-md-6">
                  <p class="small fw-semibold mb-1">Proposed shorter text</p>
                  <pre class="small text-wrap mb-0">{{ change.replacement }}</pre>
                </div>
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-primary" :disabled="!selectedIds.length"
            @click="applySelected">Apply {{ selectedIds.length }} selected {{ selectedIds.length === 1 ? 'edit' : 'edits' }}</button>
        </section>
      </div>
    </section>
  `
});
