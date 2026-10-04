import { defineComponent, useId } from 'vue';
import type { PropType } from 'vue';
import type { DataModel, DocumentModel } from '../../core/schema/schema-types.ts';
import type { DiagramConfig } from '../../core/artifacts/diagram-graph.ts';
import { importDiagramBatchResponse, importDiagramResponse } from '../../core/artifacts/diagram-drawio.ts';
import { assertDiagramCollectionLimit } from '../../core/artifacts/diagram-files.ts';
import { errorMessage } from '../../core/formatting/errors.ts';

export const DiagramAiImportControl = defineComponent({
  name: 'DiagramAiImportControl',
  emits: ['uploaded', 'batch-uploaded'],
  props: {
    config: { type: Object as PropType<DiagramConfig>, default: undefined },
    documentModel: { type: Object as PropType<DocumentModel>, default: () => ({}) },
    files: { type: Array as PropType<DataModel[]>, default: () => [] },
    replacing: { type: Object as PropType<DataModel | null>, default: null },
    batch: { type: Boolean, default: false }
  },
  setup() { return { inputId: useId() }; },
  data() { return { open: false, response: '', error: '', status: '', busy: false, disposed: false }; },
  beforeUnmount() { this.disposed = true; },
  methods: {
    async toggle() {
      this.open = !this.open;
      this.status = '';
      if (this.open) {
        await this.$nextTick();
        (this.$refs.response as HTMLTextAreaElement | undefined)?.focus();
      }
    },
    async importDiagram() {
      this.error = ''; this.status = ''; this.busy = true;
      try {
        if (this.batch) {
          const records = await importDiagramBatchResponse(this.response, this.config, this.documentModel, this.files);
          if (this.disposed) return;
          this.$emit('batch-uploaded', records);
          this.status = `${records.length} editable DrawIO ${records.length === 1 ? 'figure' : 'figures'} imported.`;
        } else {
          const payload = await importDiagramResponse(this.response, this.config, this.documentModel, this.files, this.replacing);
          if (this.disposed) return;
          assertDiagramCollectionLimit(this.files, this.replacing, [payload]);
          this.$emit('uploaded', [payload]);
          this.status = 'Editable DrawIO diagram imported.';
        }
        this.response = ''; this.open = false;
        void this.$nextTick(() => { if (!this.disposed) (this.$refs.trigger as HTMLButtonElement | undefined)?.focus(); });
      } catch (error) { if (!this.disposed) this.error = errorMessage(error); }
      finally { this.busy = false; }
    }
  },
  template: `
    <div class="diagram-ai-import-control">
      <button ref="trigger" type="button" class="btn btn-outline-primary btn-sm" :aria-expanded="open" :aria-controls="inputId + '-panel'" :disabled="busy" @click="toggle">{{ batch ? 'Import AI diagrams' : 'Import AI diagram' }}</button>
      <div v-if="open" :id="inputId + '-panel'" class="border rounded p-3 mt-2">
        <p class="small text-body-secondary">
          <template v-if="batch">Copy the section diagram prompt, then paste the AI's single dsrs-diagrams response or just its JSON. The complete batch is validated before any figure is created, and returned titles/links are kept with their figures.</template>
          <template v-else>Copy this figure's diagram prompt, then paste the AI's single dsrs-diagram response or copy just the JSON from its code block. The app creates an editable DrawIO file. {{ replacing ? 'Importing replaces only this file and keeps the existing figure ID, title, caption and links.' : 'The imported diagram uses the same preview and save workflow as an uploaded file.' }}</template>
        </p>
        <label class="form-label small" :for="inputId">{{ batch ? 'AI diagrams response' : 'AI diagram response' }}</label>
        <textarea ref="response" :id="inputId" v-model="response" class="form-control font-monospace" rows="7" spellcheck="false" :disabled="busy" :aria-invalid="!!error" :aria-describedby="error ? inputId + '-error' : undefined"></textarea>
        <p v-if="error" :id="inputId + '-error'" class="small text-danger mt-2" role="alert">{{ error }}</p>
        <div class="d-flex gap-2 mt-2">
          <button type="button" class="btn btn-primary btn-sm" :disabled="busy || !response.trim()" @click="importDiagram">{{ busy ? 'Creating DrawIO…' : batch ? 'Import figures' : replacing ? 'Replace with AI diagram' : 'Import diagram' }}</button>
          <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="busy" @click="open = false">Cancel</button>
        </div>
      </div>
      <p v-if="status" class="small text-body-secondary mt-2 mb-0" role="status">{{ status }}</p>
    </div>
  `
});
