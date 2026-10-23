import { defineComponent, markRaw } from 'vue';
import type { PrintRequest } from '../../../core/schema/schema-types.ts';
import { documentPreviewProps, DocumentPreview } from '../../../components/preview/DocumentPreview.ts';
import { printableContent } from '../../../core/printing/print-media.ts';
import { errorMessage } from '../../../core/formatting/errors.ts';
import { assembleSrs } from './assembly-model.ts';
import type { AssemblyResult } from './assembly-model.ts';
import { assemblyChunkView, assemblyPreviewChunks } from './assembly-preview-chunks.ts';

export const AssemblyStagePreview = defineComponent({
  name: 'AssemblyStagePreview',
  inheritAttrs: false,
  components: { DocumentPreview },
  props: documentPreviewProps,
  emits: ['print'],
  data() {
    return {
      activeChunk: 0,
      printSnapshot: null as AssemblyResult | null,
      printChunkIndex: -1,
      preparingPrint: false,
      printError: ''
    };
  },
  computed: {
    assembly(): AssemblyResult {
      return assembleSrs(this.documentModel, this.documentSchemas, this.projectContext);
    },
    chunks() {
      return assemblyPreviewChunks(this.assembly);
    },
    currentChunkIndex(): number {
      return Math.min(this.activeChunk, Math.max(0, this.chunks.length - 1));
    },
    currentChunk() {
      return this.chunks[this.currentChunkIndex];
    },
    currentView() {
      return this.currentChunk
        ? assemblyChunkView(this.assembly, this.currentChunk)
        : { page: this.assembly.page, data: this.assembly.data };
    },
    printChunks() {
      return this.printSnapshot ? assemblyPreviewChunks(this.printSnapshot) : [];
    },
    printView() {
      if (!this.printSnapshot || this.printChunkIndex < 0) return null;
      const chunk = this.printChunks[this.printChunkIndex];
      return chunk ? assemblyChunkView(this.printSnapshot, chunk, true) : null;
    }
  },
  methods: {
    showChunk(index: number) {
      this.activeChunk = Math.max(0, Math.min(index, this.chunks.length - 1));
      (this.$refs.previewNavigation as HTMLElement | undefined)?.scrollIntoView({
        block: 'start', behavior: 'auto'
      });
    },
    async preparePrint(request: PrintRequest) {
      if (this.preparingPrint || this.isPrinting) return;
      this.preparingPrint = true;
      this.printError = '';
      // Capture one consistent projection while the print renderer advances.
      this.printSnapshot = markRaw(this.assembly);
      const bodyParts: string[] = [];
      let coverHtml = '';

      try {
        const chunks = this.printChunks;
        for (let index = 0; index < chunks.length; index++) {
          this.printChunkIndex = index;
          await this.$nextTick();
          // Yield between chunks so browser input and rendering remain responsive.
          await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
          const root = this.$refs.printRenderer as HTMLElement | undefined;
          const content = root?.querySelector<HTMLElement>('.document-content');
          if (!content) throw new Error('The printable SRS section could not be rendered.');

          const html = await printableContent(content);
          const fragment = document.createElement('template');
          fragment.innerHTML = html;
          const printRoot = fragment.content.querySelector<HTMLElement>('.document-content');
          const body = printRoot?.querySelector<HTMLElement>('.document-body');
          if (!body) throw new Error('The printable SRS section has no document body.');

          if (index === 0) {
            coverHtml = printRoot?.querySelector('.document-cover-page')?.outerHTML || '';
          }
          // A split section keeps its heading in the interactive preview but
          // must not duplicate its section number in the final printed document.
          if (chunks[index].first > 0) {
            const continuation = body.querySelector<HTMLElement>(':scope > section');
            continuation?.querySelector(':scope > .document-heading-group')?.remove();
            continuation?.classList.add('document-continued-section');
          }
          bodyParts.push(body.innerHTML);
          // Drop the temporary fragment before the next (possibly large) diagram.
          fragment.innerHTML = '';
        }

        if (!bodyParts.length) {
          throw new Error('The assembled SRS has no populated sections to print.');
        }
        const contentHtml = `<div class="document-content">${coverHtml}<div class="document-body document-body-after-cover">${bodyParts.join('')}</div></div>`;
        this.$emit('print', { ...request, contentHtml } satisfies PrintRequest);
      } catch (error) {
        this.printError = errorMessage(error);
      } finally {
        this.printChunkIndex = -1;
        this.printSnapshot = null;
        this.preparingPrint = false;
      }
    }
  },
  template: `
    <div class="srs-assembly-preview">
      <p class="small text-body-secondary mb-2">
        Complete SRS in finished-document order. Drafts and unresolved findings remain identifiable;
        printing an unapproved document does not change its status.
      </p>
      <div v-if="chunks.length > 1" ref="previewNavigation" class="d-flex flex-wrap align-items-center gap-2 mb-3" aria-label="Complete SRS preview navigation">
        <button class="btn btn-outline-secondary" type="button" :disabled="currentChunkIndex === 0"
          @click="showChunk(currentChunkIndex - 1)">Previous</button>
        <label class="d-flex align-items-center gap-2">
          <span class="small">Section</span>
          <select class="form-select" :value="currentChunkIndex"
            @change="showChunk(Number($event.target.value))">
            <option v-for="(chunk, index) in chunks" :key="index" :value="index">
              {{ index + 1 }} / {{ chunks.length }} · {{ chunk.label }}
              {{ chunk.first > 0 ? '(continued)' : '' }}
            </option>
          </select>
        </label>
        <button class="btn btn-outline-secondary" type="button"
          :disabled="currentChunkIndex === chunks.length - 1"
          @click="showChunk(currentChunkIndex + 1)">Next</button>
        <span class="small text-body-secondary" aria-live="polite">
          Showing {{ currentChunk?.entries.length || 0 }} entries · {{ currentChunk?.label }}
        </span>
      </div>

      <p v-if="preparingPrint" class="small text-body-secondary" role="status">
        Preparing full document for printing: section {{ printChunkIndex + 1 }} of {{ printChunks.length }}…
      </p>
      <p v-if="printError" class="text-danger small" role="alert">Print failed: {{ printError }}</p>

      <document-preview
        :key="currentChunkIndex"
        :page-schema="currentView.page" :data-model="currentView.data"
        :document-config="documentConfig" :document-model="documentModel"
        :project-context="projectContext" :print-date-label="printDateLabel"
        :print-page-id="printPageId" :is-printing="isPrinting || preparingPrint"
        :show-cover="currentChunkIndex === 0" :partial="false"
        @print="preparePrint">
      </document-preview>

      <div v-if="printView" ref="printRenderer" class="srs-print-renderer" aria-hidden="true"
        style="position:fixed;left:-10000px;top:0;width:8.5in;pointer-events:none;visibility:hidden;">
        <document-preview
          :key="printChunkIndex"
          :page-schema="printView.page" :data-model="printView.data"
          :document-config="documentConfig" :document-model="documentModel"
          :project-context="projectContext" :print-date-label="printDateLabel"
          :is-printing="true" :show-cover="printChunkIndex === 0" :partial="false">
        </document-preview>
      </div>
    </div>
  `
});
