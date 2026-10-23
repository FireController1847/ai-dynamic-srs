import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { AiFormImportResult } from '../../core/ai/form-response-import.ts';

export const AiFormImportPanel = defineComponent({
  name: 'AiFormImportPanel',
  emits: ['close', 'update:text', 'validate', 'apply'],
  props: {
    text: { type: String, default: '' },
    error: { type: String, default: '' },
    report: { type: Object as PropType<AiFormImportResult | null>, default: null },
    validated: { type: Boolean, default: false },
    scopeLabel: { type: String, default: '' }
  },
  template: `
    <section class="ai-form-import-panel" aria-labelledby="ai-form-import-title">
      <div class="ai-form-import-header">
        <div>
          <p class="section-kicker mb-1">AI-assisted entry</p>
          <h2 id="ai-form-import-title">Paste AI form response</h2>
          <p class="mb-0">Use the same document and stage that generated your prompt.</p>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm" @click="$emit('close')">Close</button>
      </div>
      <ol class="ai-form-import-steps">
        <li>Copy a section or record prompt, then paste it into <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a>.</li>
        <li>Copy the returned <code>dsrs-form</code> JSON block and paste it below.</li>
        <li>Validate the changes, review the results, then apply them to this workspace.</li>
      </ol>
      <p v-if="scopeLabel" class="ai-form-import-context">Most recently copied: <strong>{{ scopeLabel }}</strong></p>
      <label class="form-label" for="ai-form-response-json">AI JSON response</label>
      <textarea
        id="ai-form-response-json"
        class="form-control ai-form-import-input"
        rows="8"
        :value="text"
        placeholder='{"format":"dsrs-form","version":1,...}'
        spellcheck="false"
        @input="$emit('update:text', $event.target.value)"
      ></textarea>
      <p class="small text-body-secondary mt-2 mb-0">Nothing changes when you paste. Existing answers are preserved for omitted or null values. Diagram responses use their separate import control.</p>
      <div v-if="error" class="ai-form-import-error mt-3" role="alert">{{ error }}</div>
      <div v-if="report && validated" class="ai-form-import-review mt-3" role="status">
        <strong>Validation passed</strong>
        <p class="mb-1">
          {{ report.updatedFields }} field updates ·
          {{ report.updatedRecords }} existing records ·
          {{ report.addedRecords }} new records ·
          {{ report.addedNestedRecords }} new nested items
        </p>
        <p v-if="report.skippedNulls" class="mb-1">{{ report.skippedNulls }} unsupported values will remain unchanged.</p>
        <div v-if="report.needsInformation.length">
          <strong>Still needs information</strong>
          <ul class="mb-0">
            <li v-for="(need, index) in report.needsInformation" :key="index">{{ need.path }}: {{ need.reason }}</li>
          </ul>
        </div>
      </div>
      <div class="ai-form-import-actions">
        <button type="button" class="btn btn-outline-secondary" :disabled="!text.trim()" @click="$emit('validate')">Validate JSON</button>
        <button type="button" class="btn btn-primary" :disabled="!validated || !report" @click="$emit('apply')">Apply to workspace</button>
      </div>
    </section>
  `
});
