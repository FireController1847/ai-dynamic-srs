import type { CopyRequest, DataModel, DocumentModel, Field, Repeater, SchemaNode, Section } from '../../core/schema/schema-types.ts';
import type { Note, NotesModel } from './note-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { buildFormPrompt } from "../../core/ai/prompt-builder.ts";
import { addEvidenceContextToPrompt } from '../../core/ai/evidence-context.ts';
import { hasValue as hasContent, nextNumericId } from "../../core/records/record-values.ts";
import { CopyPromptControl, SectionInfo } from "../../components/controls/FormControls.ts";
import type { FieldPromptFactory } from '../../components/controls/FormControls.ts';
import { SchemaField } from "../../components/fields/SchemaField.ts";
import { countNested, dateTimeLabel, newNote, populatedNotes, timestampLabel, today } from "./note-model.ts";

export const NotesForm = defineComponent({
  components: { SchemaField, SectionInfo, CopyPromptControl },
  emits: ["copy-markdown"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object as PropType<NotesModel>, required: true },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, default: () => ({}) },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, default: () => [] }
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
    bodyField(): Field {
      const field = this.noteSection.repeatable.fields.find(({ key }) => key === 'body');
      if (!field) throw new Error('Notes schema is missing its body field.');
      return { ...field, helpText: 'Keep this as the current understanding. Explain a meaningful revision with the optional change explanation when editing.' };
    },
    promptSection(): Section & { repeatable: Repeater } {
      return { ...this.noteSection, repeatable: { ...this.noteSection.repeatable, fields: [this.bodyField, this.referenceField],
        aiAddendum: 'Each note has editable Note and References inputs. Creation dates are recorded automatically. Meaningful revisions can have an optional change explanation; the application creates the dated edit-history record, so do not return direct date, editor, or history inputs.' } };
    },
    promptPage(): SchemaNode {
      return { ...this.pageSchema, sections: [this.promptSection] };
    },
    reasonField(): Field {
      return { key: 'editReason', label: 'Explain this change', type: 'text', optional: true, default: '',
        placeholder: "Only needed when the note's meaning changed",
        aiHint: 'Give a brief confirmed reason for this actual revision. Omit for minor spelling or formatting fixes; do not invent an edit.' };
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
      const prompt = buildFormPrompt(this.promptPage, this.promptSection, this.dataModel, this.documentModel);
      return addEvidenceContextToPrompt(prompt, this.pageSchema.evidence, this.documentModel, this.documentSchemas);
    },
    notePrompt(note: Note, path: readonly (string | number)[] = []): CopyRequest {
      const isDraft = note === this.draft;
      const form = this;
      return { get markdown() {
        const isEditing = !isDraft && form.editingId === note.id;
        const section = isEditing ? { ...form.promptSection, repeatable: { ...form.promptSection.repeatable, fields: [...form.promptSection.repeatable.fields, form.reasonField] } } : form.promptSection;
        const record: DataModel = isDraft ? { ...note, id: undefined } : isEditing ? { ...note, editReason: form.editReason } : note;
        const model: DataModel = isEditing ? { ...form.dataModel, notes: form.dataModel.notes.map(saved => saved === note ? record : saved) } : form.dataModel;
        const prompt = buildFormPrompt(form.promptPage, section, model, form.documentModel, { record, fieldPath: path });
        return addEvidenceContextToPrompt(prompt, form.pageSchema.evidence, form.documentModel, form.documentSchemas);
      },
        title: `${isDraft ? 'New note' : 'Note ' + note.id}${path.length ? ' — ' + path.join(' / ') : ''}`,
        key: `${this.pageSchema.id}:${this.noteSection.key}:${isDraft ? 'draft' : 'record-' + note.id}:${JSON.stringify(path)}` };
    },
    fieldPromptFactory(note: Note): FieldPromptFactory {
      return path => this.notePrompt(note, path);
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
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="small text-body-secondary">New note</span>
            <copy-prompt-control persistent :copied="copiedSection === notePrompt(draft).key" label="Copy formatted-answer prompt for this new note"
              tooltip="Copies all editable inputs for this new note. The AI returns ready-to-enter note text and any supported references."
              @copy="$emit('copy-markdown', notePrompt(draft))"></copy-prompt-control>
          </div>
          <div class="row g-3">
            <schema-field :field="{ ...bodyField, rows: 4, placeholder: 'Write a note…', hideLabel: true }"
              input-class="notes-quick-input"
              :id-base="pageSchema.id + '-draft-body'" :model-value="draft.body" :document-model="documentModel"
              :copy-prompt="fieldPromptFactory(draft)" :prompt-path="['body']" :copied-section="copiedSection"
              @copy-markdown="$emit('copy-markdown', $event)" @update:model-value="draft.body = $event"></schema-field>
          </div>

          <details class="notes-optional-details mt-3">
            <summary>Add references <span class="optional-label">Optional</span></summary>
            <div class="row g-3 pt-3">
              <schema-field :field="referenceField" :id-base="pageSchema.id + '-draft-references'" :model-value="draft.references" :document-model="documentModel"
                :copy-prompt="fieldPromptFactory(draft)" :prompt-path="['references']" :copied-section="copiedSection"
                @copy-markdown="$emit('copy-markdown', $event)" @update:model-value="draft.references = $event"></schema-field>
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
                <div class="d-flex align-items-center gap-2">
                  <copy-prompt-control persistent :copied="copiedSection === notePrompt(note).key" :label="'Copy formatted-answer prompt for note ' + note.id"
                    tooltip="Copies all editable inputs for this note, with its current answers. The AI returns formatted note text and supported references."
                    @copy="$emit('copy-markdown', notePrompt(note))"></copy-prompt-control>
                  <button class="btn btn-outline-secondary btn-sm" type="button" @click="startEdit(note)">Edit</button>
                </div>
              </div>
              <p v-if="note.updatedAt || note.updatedDate || note.references?.length" class="notes-entry-meta mb-0"><span v-if="note.updatedAt || note.updatedDate">Edited {{ editedLabel(note) }}</span><span v-if="(note.updatedAt || note.updatedDate) && note.references?.length"> · </span><span v-if="note.references?.length">{{ note.references.length }} reference{{ note.references.length === 1 ? '' : 's' }}</span></p>
            </template>

            <template v-else>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span class="small text-body-secondary">Editing note {{ note.id }}</span>
                <copy-prompt-control persistent :copied="copiedSection === notePrompt(note).key" :label="'Copy formatted-answer prompt for note ' + note.id"
                  tooltip="Copies all editable inputs for this note. The AI returns ready-to-enter answers without starting an interview."
                  @copy="$emit('copy-markdown', notePrompt(note))"></copy-prompt-control>
              </div>
              <div class="row g-3">
                <schema-field :field="{ ...bodyField, hideLabel: true }" :id-base="pageSchema.id + '-' + note.id + '-body'"
                  :model-value="note.body" :document-model="documentModel" :copy-prompt="fieldPromptFactory(note)"
                  :prompt-path="['body']" :copied-section="copiedSection"
                  @copy-markdown="$emit('copy-markdown', $event)" @update:model-value="note.body = $event"></schema-field>
              </div>
              <details class="notes-optional-details mt-3">
                <summary>Edit references <span class="optional-label">Optional</span></summary>
                <div class="row g-3 pt-3">
                  <schema-field :field="referenceField" :id-base="pageSchema.id + '-' + note.id + '-references'" :model-value="note.references" :document-model="documentModel"
                    :copy-prompt="fieldPromptFactory(note)" :prompt-path="['references']" :copied-section="copiedSection"
                    @copy-markdown="$emit('copy-markdown', $event)" @update:model-value="note.references = $event"></schema-field>
                </div>
              </details>
              <div class="row mt-3"><schema-field :field="reasonField" :id-base="pageSchema.id + '-' + note.id + '-edit-reason'"
                :model-value="editReason" :document-model="documentModel" :copy-prompt="fieldPromptFactory(note)"
                :prompt-path="['editReason']" :copied-section="copiedSection"
                @copy-markdown="$emit('copy-markdown', $event)" @update:model-value="editReason = $event"></schema-field></div>
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

export { NotesPreview } from "./NotesPreview.ts";
