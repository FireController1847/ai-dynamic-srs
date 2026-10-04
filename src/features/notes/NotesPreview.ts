import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Note, NotesModel } from './note-types.ts';
import type { DataModel, MetadataEntry, SchemaNode } from '../../core/schema/schema-types.ts';
import { formatDate as formatDocumentDate } from '../../core/formatting/dates.ts';
import { formatDocumentTitle } from '../../core/formatting/document-titles.ts';
import { PrintDocumentButton } from '../../components/controls/PrintButton.ts';
import { DocumentCoverPage } from '../../components/preview/DocumentCoverPage.ts';
import { PreviewWatermark } from '../../components/preview/PreviewWatermark.ts';
import { dateTimeLabel, populatedNotes, timestampLabel } from './note-model.ts';

export const NotesPreview = defineComponent({
  components: { DocumentCoverPage, PreviewWatermark, PrintDocumentButton },
  emits: ["print"],
  props: {
    dataModel: { type: Object as PropType<NotesModel>, required: true },
    isPrinting: { type: Boolean, default: false },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    printDateLabel: { type: String, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true }
  },
  computed: {
    coverMetadataEntries(): MetadataEntry[] {
      return [
        { key: "version", label: "Version", value: this.version },
        { key: "entries", label: "Entries", value: this.notes.length }
      ];
    },
    documentTitle(): string {
      return formatDocumentTitle(this.projectTitle, this.pageSchema.title || "General Notes");
    },
    notes(): Note[] {
      return populatedNotes(this.dataModel);
    },
    projectTitle(): unknown {
      return this.projectContext.projectName || "";
    },
    version(): unknown {
      return this.dataModel.version || "0.1";
    }
  },
  methods: {
    formatDate(value: unknown) {
      return formatDocumentDate(value);
    },
    referenceLabel(reference: DataModel, index: number) {
      return reference.title || `Reference ${index + 1}`;
    },
    postedLabel(note: Note) {
      return timestampLabel(note);
    },
    editLabel(edit: DataModel) {
      return dateTimeLabel(edit.editedAt, edit.editedDate);
    }
  },
  template: `
    <div :id="pageSchema.id + '-preview'" class="document-preview-section">
      <div class="preview-toolbar">
        <div>
          <p class="section-kicker mb-1">Live document</p>
          <h2 class="h4 mb-1">Preview</h2>
          <p class="text-body-secondary mb-0">Every note, reference, and edit explanation is collated automatically.</p>
        </div>
        <print-document-button
          :is-printing="isPrinting"
          @print="$emit('print', pageSchema.id)"
        ></print-document-button>
      </div>

      <article class="document-preview notes-document is-print-target" :aria-label="pageSchema.label + ' document preview'">
        <header class="print-running-header" aria-hidden="true">
          <span>{{ documentTitle }}</span>
          <span>{{ printDateLabel }}</span>
        </header>

        <div class="document-content notes-document-content">
          <preview-watermark :is-printing="isPrinting"></preview-watermark>
          <document-cover-page
            :document-code="pageSchema.code"
            :document-name="pageSchema.title || pageSchema.label"
            :metadata-entries="coverMetadataEntries"
            :project-title="projectTitle"
          ></document-cover-page>

          <div class="document-body document-body-after-cover">
          <section>
            <h2>1. Notes</h2>
            <ul v-if="notes.length" class="notes-document-list">
              <li v-for="note in notes" :key="note.id" class="notes-document-item">
                <p><span class="preserve-lines">{{ note.body }}</span><time class="notes-posted-at" :datetime="note.createdAt || note.createdDate">({{ postedLabel(note) }})</time></p>

                <div v-if="note.references?.length" class="notes-document-supporting">
                  <strong>References</strong>
                  <ol class="notes-reference-list">
                  <li v-for="(reference, referenceIndex) in note.references" :key="reference.id">
                    <strong>{{ referenceLabel(reference, referenceIndex) }}</strong>
                    <span v-if="reference.type"> — {{ reference.type }}</span>
                    <span v-if="reference.locator" class="notes-reference-locator">{{ reference.locator }}</span>
                    <span v-if="reference.asOfDate">Source date / as of: {{ formatDate(reference.asOfDate) }}</span>
                    <span v-if="reference.notes" class="preserve-lines">{{ reference.notes }}</span>
                  </li>
                  </ol>
                </div>

                <div v-if="note.editHistory?.length" class="notes-document-supporting">
                  <strong>Edit history</strong>
                  <ul class="notes-edit-list">
                    <li v-for="edit in note.editHistory" :key="edit.id"><span v-if="edit.editedAt || edit.editedDate">{{ editLabel(edit) }} — </span>{{ edit.reason }}</li>
                  </ul>
                </div>
              </li>
            </ul>
            <p v-if="!notes.length" class="document-empty">No notebook entries have been completed yet.</p>
          </section>
          </div>
        </div>

        <footer class="print-running-footer" aria-hidden="true">
          <span>{{ projectTitle || "Untitled Dynamic SRS" }}</span>
          <span class="print-page-number">Page </span>
          <span>{{ pageSchema.code }} · v{{ version }}</span>
        </footer>
      </article>
    </div>
  `
});
