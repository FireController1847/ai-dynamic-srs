import type { Note, NotesModel } from './note-types.ts';
import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { buildSectionPrompt } from "../../core/ai/prompt-builder.ts";
import { formatDate as formatDocumentDate } from "../../core/formatting/dates.ts";
import { formatDocumentTitle } from "../../core/formatting/document-titles.ts";
import { hasValue as hasContent, nextNumericId } from "../../core/records/record-values.ts";
import { PrintDocumentButton } from "../../components/controls/PrintButton.ts";
import { DocumentCoverPage } from "../../components/preview/DocumentCoverPage.ts";
import { PreviewWatermark } from "../../components/preview/PreviewWatermark.ts";
import { SectionInfo } from "../../components/controls/FormControls.ts";
import { SchemaField } from "../../components/fields/SchemaField.ts";
import { countNested, dateTimeLabel, newNote, populatedNotes, timestampLabel, today } from "./note-model.ts";

export const NotesForm = defineComponent({
  components: { SchemaField, SectionInfo },
  emits: ["copy-markdown"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object as PropType<NotesModel>, required: true },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true }
  },
  data() {
    return {
      draft: newNote(),
      editingId: null as number | null,
      editReason: "",
      originalEditSnapshot: ""
    };
  },
  computed: {
    noteSection(): Section & { repeatable: Repeater } {
      const section = (this.pageSchema.sections || []).find(({ key }) => key === "notebookEntries");
      if (!section?.repeatable) throw new Error("Notes schema is missing its notebook entries repeater.");
      return section as Section & { repeatable: Repeater };
    },
    notes(): Note[] {
      return populatedNotes(this.dataModel);
    },
    referenceField(): Field {
      const field = this.noteSection.repeatable.fields.find(({ key }) => key === "references");
      if (!field) throw new Error("Notes schema is missing its references field.");
      return field;
    },
    referenceCount(): number {
      return countNested(this.notes, "references");
    },
    editCount(): number {
      return countNested(this.notes, "editHistory");
    },
    copyKey(): string {
      return `${this.pageSchema.id}:${this.noteSection.key}`;
    }
  },
  methods: {
    addNote() {
      const body = this.draft.body.trim();
      if (!body) {
        return;
      }

      const notes = this.dataModel.notes;
      const emptyIndex = notes.findIndex((note) => !hasContent(note.title) && !hasContent(note.body));
      const nextId = nextNumericId(notes);
      const note = {
        ...this.draft,
        id: emptyIndex >= 0 ? notes[emptyIndex].id : nextId,
        title: "",
        body,
        createdDate: today(),
        createdAt: new Date().toISOString()
      };

      if (emptyIndex >= 0) {
        notes.splice(emptyIndex, 1, note);
      } else {
        notes.push(note);
      }

      this.draft = newNote();
    },
    editSnapshot(note: Note) {
      return JSON.stringify({
        body: note.body,
        references: note.references
      });
    },
    finishEdit(note: Note) {
      if (this.editSnapshot(note) !== this.originalEditSnapshot) {
        note.updatedAt = new Date().toISOString();
        note.updatedDate = today();
        if (this.editReason.trim()) {
          const history = Array.isArray(note.editHistory) ? note.editHistory : (note.editHistory = []);
          const nextId = nextNumericId(history);
          history.push({
            id: nextId,
            editedDate: note.updatedDate,
            editedAt: note.updatedAt,
            editedBy: note.author || this.dataModel.maintainedBy || "",
            changeSummary: "Updated the note or its supporting details.",
            reason: this.editReason.trim()
          });
        }
      }
      this.editingId = null;
      this.editReason = "";
      this.originalEditSnapshot = "";
    },
    promptForNotes() {
      return buildSectionPrompt(this.pageSchema, this.noteSection, this.dataModel);
    },
    postedLabel(note: Note) {
      return timestampLabel(note);
    },
    editedLabel(note: Note) {
      return dateTimeLabel(note.updatedAt, note.updatedDate);
    },
    removeNote(note: Note) {
      const index = this.dataModel.notes.indexOf(note);
      if (index >= 0) {
        this.dataModel.notes.splice(index, 1);
      }
      if (!this.dataModel.notes.length) {
        this.dataModel.notes.push(newNote(1));
      }
      this.editingId = null;
      this.editReason = "";
      this.originalEditSnapshot = "";
    },
    startEdit(note: Note) {
      this.editingId = note.id;
      this.editReason = "";
      this.originalEditSnapshot = this.editSnapshot(note);
    }
  },
  template: `
    <div class="notes-quick-workspace">
      <section :id="pageSchema.id + '-notebook-entries'" class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <div class="section-title-row mb-2">
            <h3 class="h5 mb-0">Quick note</h3>
            <section-info
              title="Notebook entries"
              :copy-key="copyKey"
              :help="noteSection.help"
              :copy-text="promptForNotes()"
              :copied="copiedSection === copyKey"
              @copy-markdown="$emit('copy-markdown', $event)"
            ></section-info>
          </div>
          <p class="text-body-secondary">Each note becomes one item in the running list.</p>
          <textarea v-model="draft.body" class="form-control notes-quick-input" rows="4" placeholder="Write a note…" aria-label="New note"></textarea>

          <details class="notes-optional-details mt-3">
            <summary>Add references <span class="optional-label">Optional</span></summary>
            <div class="row g-3 pt-3">
              <schema-field :field="referenceField" :id-base="pageSchema.id + '-draft-references'" :model-value="draft.references" @update:model-value="draft.references = $event"></schema-field>
            </div>
          </details>

          <div class="notes-add-row mt-3">
            <small>The creation date is recorded automatically.</small>
            <button class="btn btn-primary" type="button" :disabled="!draft.body.trim()" @click="addNote">Add note</button>
          </div>
        </div>
      </section>

      <section class="notes-pulse" aria-label="Notebook pulse">
        <strong>{{ notes.length }} notes</strong><span>·</span><span>{{ referenceCount }} references</span><span>·</span><span>{{ editCount }} explained edits</span>
      </section>

      <section class="notes-list" aria-labelledby="notes-list-heading">
        <h3 id="notes-list-heading" class="h5 mb-3">Notes</h3>
        <ul class="notes-bullet-list">
        <li v-for="note in notes" :key="note.id" class="notes-entry-card">
          <div class="notes-entry-content">
            <template v-if="editingId !== note.id">
              <div class="notes-entry-heading">
                <p class="mb-1"><span class="preserve-lines">{{ note.body }}</span><time class="notes-posted-at" :datetime="note.createdAt || note.createdDate">({{ postedLabel(note) }})</time></p>
                <button class="btn btn-outline-secondary btn-sm" type="button" @click="startEdit(note)">Edit</button>
              </div>
              <p v-if="note.updatedAt || note.updatedDate || note.references?.length" class="notes-entry-meta mb-0"><span v-if="note.updatedAt || note.updatedDate">Edited {{ editedLabel(note) }}</span><span v-if="(note.updatedAt || note.updatedDate) && note.references?.length"> · </span><span v-if="note.references?.length">{{ note.references.length }} reference{{ note.references.length === 1 ? '' : 's' }}</span></p>
            </template>

            <template v-else>
              <textarea v-model="note.body" class="form-control" rows="5" aria-label="Edit note"></textarea>
              <details class="notes-optional-details mt-3">
                <summary>Edit references <span class="optional-label">Optional</span></summary>
                <div class="row g-3 pt-3">
                  <schema-field :field="referenceField" :id-base="pageSchema.id + '-' + note.id + '-references'" :model-value="note.references" @update:model-value="note.references = $event"></schema-field>
                </div>
              </details>
              <div class="mt-3"><label class="form-label">Explain this change <span class="optional-label">Optional</span></label><input v-model="editReason" class="form-control" type="text" placeholder="Only needed when the note's meaning changed"></div>
              <div class="notes-edit-actions mt-3"><button class="btn btn-link btn-sm text-danger" type="button" @click="removeNote(note)">Delete note</button><button class="btn btn-primary btn-sm" type="button" @click="finishEdit(note)">Done</button></div>
            </template>
          </div>
        </li>
        </ul>
        <p v-if="!notes.length" class="notes-empty-state">No notes yet. Add the first one above.</p>
      </section>
    </div>
  `
});

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
