import type { CopyRequest, DataModel, DocumentModel, Field, Repeater, SchemaNode, Section } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { buildInterviewPrompt, buildFormPrompt } from "../../core/ai/prompt-builder.ts";
import { addEvidenceContextToPrompt } from "../../core/ai/evidence-context.ts";
import { completion } from "../../core/schema/form-completion.ts";
import { dataModelForSection, isDataModel, mutableRecords, recordItems } from "../../core/schema/data-models.ts";
import { fieldVisible } from "../../core/schema/field-visibility.ts";
import { createRepeaterItem } from "../../core/schema/state-factory.ts";
import { formatRecordDisplayId } from "../../core/records/record-values.ts";
import { nextRepeaterRecordId, removeRepeaterRecord } from "../../core/records/record-lifecycle.ts";
import { resolveReferenceField } from "../../core/records/reference-fields.ts";
import { sectionRecords } from "../../core/schema/section-records.ts";
import { DiagramUploadControl } from "../diagrams/DiagramUploadControl.ts";
import { DiagramAiImportControl } from '../diagrams/DiagramAiImportControl.ts';
import { diagramPromptField } from '../../core/ai/diagram-prompt.ts';
import { CopyPromptControl, SectionInfo } from "../controls/FormControls.ts";
import type { FieldPromptFactory } from '../controls/FormControls.ts';
import { SchemaField } from "../fields/SchemaField.ts";
import { RelatedRecordGroups } from "./RelatedRecordGroups.ts";

export type RepeatableSection = Section & { repeatable: Repeater };

export const dynamicFormProps = {
  copiedSection: { type: String, default: "" },
  dataModel: { type: Object as PropType<DataModel>, required: true },
  documentModel: { type: Object as PropType<DocumentModel>, default: () => ({}) },
  documentSchemas: { type: Array as PropType<SchemaNode[]>, default: () => [] },
  pageSchema: { type: Object as PropType<SchemaNode>, required: true }
} as const;

export const DynamicForm = defineComponent({
  components: { SchemaField, SectionInfo, CopyPromptControl, DiagramUploadControl, DiagramAiImportControl, RelatedRecordGroups },
  emits: ["copy-markdown"],
  props: dynamicFormProps,
  computed: {
    visibleSections(): Section[] {
      return (this.pageSchema.sections || []).filter(section => section.repeatable || this.fieldsFor(section).length);
    },
    periodCount(): number {
      if (!this.pageSchema.periodField) {
        return 0;
      }

      const configured = Number(this.dataModel[this.pageSchema.periodField]);
      const minimum = this.pageSchema.periods?.minimum || 1;
      const maximum = this.pageSchema.periods?.maximum || 20;
      const fallback = this.pageSchema.periods?.default || minimum;
      return Math.min(maximum, Math.max(minimum, Number.isFinite(configured) ? Math.round(configured) : fallback));
    }
  },
  methods: {
    addItem(section: RepeatableSection) {
      const sectionModel = this.sectionModel(section);
      const items = mutableRecords(sectionModel, section.repeatable.dataKey);
      items.push(createRepeaterItem(section.repeatable, nextRepeaterRecordId(section.repeatable, items, this.documentModel)));
    },
    copyKey(section: Section, record?: DataModel, path: readonly (string | number)[] = []): string {
      return `${this.pageSchema.id}:${section.key}:${record ? 'record-' + record.id : 'section'}:${JSON.stringify(path)}`;
    },
    fieldId(section: Section, field: Field, item: DataModel | null = null) {
      return [this.pageSchema.id, section.id, item?.id, field.key].filter(Boolean).join("-");
    },
    fieldsFor(section: Section, item: DataModel | null = null) {
      const fields = section.repeatable?.fields || section.fields || [];
      const model = item || this.sectionModel(section);
      return fields.filter((field) => !field.hidden && fieldVisible(field, model))
        .map((field) => resolveReferenceField(field, this.documentModel, model[field.key]));
    },
    itemsFor(section: RepeatableSection) {
      return sectionRecords(section.repeatable, this.sectionModel(section));
    },
    artifactFiles(section: RepeatableSection): DataModel[] {
      const artifactField = section.repeatable.artifactField;
      if (!artifactField) return [];
      return recordItems(this.sectionModel(section)[section.repeatable.dataKey])
        .map((record) => record[artifactField])
        .filter(isDataModel);
    },
    diagramFieldFor(section: Section): Field | undefined { return diagramPromptField(section.repeatable?.fields || section.fields || []); },
    addArtifacts(section: RepeatableSection, files: DataModel[]) {
      const artifactField = section.repeatable.artifactField;
      if (!artifactField) return;
      const records = mutableRecords(this.sectionModel(section), section.repeatable.dataKey);
      for (const file of files) {
        records.push(createRepeaterItem(section.repeatable, nextRepeaterRecordId(section.repeatable, records, this.documentModel), {
          title: file.title, [artifactField]: file
        }));
      }
    },
    itemTitle(section: RepeatableSection, item: DataModel, index: number) {
      const displayId = section.repeatable.displayId;
      return displayId
        ? formatRecordDisplayId(displayId, item, index)
        : `${section.repeatable.itemLabel || "Item"} ${index + 1}`;
    },
    promptFor(section: Section, record?: DataModel, fieldPath?: readonly (string | number)[]): string {
      const prompt = buildFormPrompt(this.pageSchema, section, this.dataModel, this.documentModel, { record, fieldPath });
      return addEvidenceContextToPrompt(
        prompt,
        this.pageSchema.evidence,
        this.documentModel,
        this.documentSchemas
      );
    },
    promptRequest(section: Section, record?: DataModel, path: readonly (string | number)[] = []): CopyRequest {
      const recordLabel = record && section.repeatable ? formatRecordDisplayId(section.repeatable.displayId, record) : '';
      const form = this;
      return {
        get markdown() { return form.promptFor(section, record, path); },
        title: [section.title, recordLabel, ...path].filter(value => value !== '').join(' — '),
        key: this.copyKey(section, record, path)
      };
    },
    fieldPromptFactory(section: Section, record?: DataModel): FieldPromptFactory {
      return path => this.promptRequest(section, record, path);
    },
    removeItem(section: RepeatableSection, item: DataModel) {
      const items = mutableRecords(this.sectionModel(section), section.repeatable.dataKey);
      removeRepeaterRecord(section.repeatable, items, item, this.documentModel);
    },
    sectionModel(section: Section): DataModel {
      return dataModelForSection(section, this.dataModel, this.documentModel);
    }
  },
  template: `
    <form @submit.prevent>
      <section
        v-for="(section, sectionIndex) in visibleSections"
        :id="pageSchema.id + '-' + section.id"
        :key="section.key"
        class="form-section card border-0 shadow-sm mb-4"
      >
        <div class="card-body p-4">
          <div class="section-heading" :class="{ 'align-items-start': section.repeatable }">
            <span class="section-number">{{ String(sectionIndex + 1).padStart(2, '0') }}</span>
            <div :class="{ 'flex-grow-1': section.repeatable }">
              <div class="section-title-row">
                <h3 class="h5 mb-1">{{ section.title }}</h3>
                <section-info
                  :title="section.title"
                  :diagram="Boolean(diagramFieldFor(section))"
                  :copy-key="copyKey(section)"
                  :help="section.help"
                  :copy-text="promptFor(section)"
                  :copied="copiedSection === copyKey(section)"
                  @copy-markdown="$emit('copy-markdown', $event)"
                ></section-info>
              </div>
              <p class="text-body-secondary mb-0">{{ section.description }}</p>
            </div>
            <button
              v-if="section.repeatable && !section.repeatable.parent && section.repeatable.allowAdd !== false"
              class="btn btn-outline-primary btn-sm"
              type="button"
              @click="addItem(section)"
            >{{ section.repeatable.addLabel }}</button>
          </div>

          <related-record-groups v-if="section.repeatable?.parent" :section="section" :page-schema="pageSchema"
            :data-model="dataModel" :document-model="documentModel" :document-schemas="documentSchemas"
            :copied-section="copiedSection" :periods="periodCount" @copy-markdown="$emit('copy-markdown', $event)"></related-record-groups>
          <template v-else-if="section.repeatable">
            <div v-if="section.repeatable.artifactField" class="d-flex flex-wrap gap-3 align-items-start mt-3">
              <diagram-upload-control
                :key="pageSchema.id + section.id"
                :files="artifactFiles(section)"
                :multiple="true"
                label="Upload DrawIO/XML/PNG/JPEG"
                @uploaded="addArtifacts(section, $event)"
              ></diagram-upload-control>
              <diagram-ai-import-control v-if="diagramFieldFor(section)" :key="pageSchema.id + section.id + '-ai'"
                :config="diagramFieldFor(section).diagram" :document-model="documentModel" :files="artifactFiles(section)"
                @uploaded="addArtifacts(section, $event)"></diagram-ai-import-control>
            </div>
            <p v-if="!itemsFor(section).length" class="nested-records-empty mt-4 mb-0">
              {{ section.repeatable.emptyText || 'No records have been added. Use the button above when one applies.' }}
            </p>
            <div
              v-for="(item, itemIndex) in itemsFor(section)"
              :key="item.id"
              class="repeatable-item mt-4"
            >
              <div class="d-flex align-items-center justify-content-between mb-3">
                <h4 class="h6 mb-0">{{ itemTitle(section, item, itemIndex) }}</h4>
                <copy-prompt-control persistent :copied="copiedSection === copyKey(section, item)"
                  :label="(diagramFieldFor(section) ? 'Copy AI diagram prompt for ' : 'Copy formatted-answer prompt for ') + itemTitle(section, item, itemIndex)"
                  :tooltip="diagramFieldFor(section) ? 'Generates one semantic diagram response for this figure. Paste the dsrs-diagram block into Import AI diagram.' : 'Copies every input and nested field for this exact record. The AI returns ready-to-enter answers for this record.'"
                  @copy="$emit('copy-markdown', promptRequest(section, item))"></copy-prompt-control>
                <button
                  v-if="section.repeatable.allowRemove !== false && itemsFor(section).length > section.repeatable.minimum"
                  class="btn btn-link btn-sm text-danger p-0"
                  type="button"
                  @click="removeItem(section, item)"
                >Remove</button>
              </div>
              <div class="row g-3">
                <schema-field
                  v-for="field in fieldsFor(section, item)"
                  :key="field.key"
                  :field="field"
                  :document-model="documentModel"
                  :id-base="fieldId(section, field, item)"
                  :model-value="item[field.key]"
                  :periods="periodCount"
                  :copy-prompt="fieldPromptFactory(section, item)" :prompt-path="[field.key]" :copied-section="copiedSection"
                  @copy-markdown="$emit('copy-markdown', $event)"
                  @update:model-value="item[field.key] = $event"
                ></schema-field>
              </div>
            </div>
          </template>

          <div v-else class="row g-3 mt-1">
            <schema-field
              v-for="field in fieldsFor(section)"
              :key="field.key"
              :field="field"
              :document-model="documentModel"
              :id-base="fieldId(section, field)"
              :model-value="sectionModel(section)[field.key]"
              :periods="periodCount"
              :copy-prompt="fieldPromptFactory(section)" :prompt-path="[field.key]" :copied-section="copiedSection"
              @copy-markdown="$emit('copy-markdown', $event)"
              @update:model-value="sectionModel(section)[field.key] = $event"
            ></schema-field>
          </div>
        </div>
      </section>
    </form>
  `
});

export const FormProgress = defineComponent({
  components: { CopyPromptControl },
  emits: ["copy-markdown"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object as PropType<DataModel>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, default: () => ({}) },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, default: () => [] },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true }
  },
  computed: {
    copyKey(): string {
      return `${this.pageSchema.id}:interview`;
    },
    interviewPrompt(): string {
      return buildInterviewPrompt(this.pageSchema, this.dataModel, this.documentModel);
    },
    percent(): number {
      return completion(this.pageSchema, this.dataModel, this.documentModel);
    }
  },
  template: `
    <div class="form-completion-box">
      <div class="form-completion-heading">
        <div class="d-flex flex-grow-1 justify-content-between gap-2 small">
          <span>{{ pageSchema.form?.showCompletion === false ? 'AI guidance' : 'Form completion' }}</span>
          <strong v-if="pageSchema.form?.showCompletion !== false">{{ percent }}%</strong>
        </div>
        <copy-prompt-control persistent
          button-class="completion-copy-trigger"
          :copied="copiedSection === copyKey"
          :label="'Copy the ' + pageSchema.title + ' AI interview prompt'"
          tooltip="Copies a complete interview of this tab: every existing record and nested input. The AI gathers missing information naturally, then hands off to formatted-answer prompts."
          @copy="$emit('copy-markdown', { markdown: interviewPrompt, title: pageSchema.title + ' interview prompt', key: copyKey })"
        ></copy-prompt-control>
      </div>
      <div
        v-if="pageSchema.form?.showCompletion !== false" class="progress"
        role="progressbar"
        :aria-label="pageSchema.title + ' completion'"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="progress-bar" :style="{ width: percent + '%' }"></div>
      </div>
    </div>
  `
});
