import { buildInterviewPrompt, buildSectionPrompt } from "../../core/ai/prompt-builder.js";
import { addEvidenceContextToPrompt } from "../../core/ai/evidence-context.js";
import { completion } from "../../core/schema/form-completion.js";
import { dataModelForSection } from "../../core/schema/data-models.js";
import { fieldVisible } from "../../core/schema/field-visibility.js";
import { createRepeaterItem } from "../../core/schema/state-factory.js";
import { formatRecordDisplayId, nextNumericId } from "../../core/records/record-values.js";
import { resolveReferenceField } from "../../core/records/reference-fields.js";
import { sectionRecords } from "../../core/schema/section-records.js";
import { DiagramUploadControl } from "../diagrams/DiagramUploadControl.js";
import { CopyPromptControl, SectionInfo } from "../controls/FormControls.js";
import { SchemaField } from "../fields/SchemaField.js";
import { RelatedRecordGroups } from "./RelatedRecordGroups.js";

export const DynamicForm = {
  components: { SchemaField, SectionInfo, DiagramUploadControl, RelatedRecordGroups },
  emits: ["copy-markdown"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object, required: true },
    documentModel: { type: Object, default: () => ({}) },
    documentSchemas: { type: Array, default: () => [] },
    pageSchema: { type: Object, required: true }
  },
  computed: {
    visibleSections() {
      return this.pageSchema.sections.filter(section => section.repeatable || this.fieldsFor(section).length);
    },
    periodCount() {
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
    addItem(section) {
      const sectionModel = this.sectionModel(section);
      const items = Array.isArray(sectionModel[section.repeatable.dataKey])
        ? sectionModel[section.repeatable.dataKey]
        : (sectionModel[section.repeatable.dataKey] = []);
      const nextId = nextNumericId(items);
      items.push(createRepeaterItem(section.repeatable, nextId));
    },
    copyKey(section) {
      return `${this.pageSchema.id}:${section.key}`;
    },
    fieldId(section, field, item = null) {
      return [this.pageSchema.id, section.id, item?.id, field.key].filter(Boolean).join("-");
    },
    fieldsFor(section, item = null) {
      const fields = section.repeatable?.fields || section.fields || [];
      const model = item || this.sectionModel(section);
      return fields.filter((field) => !field.hidden && fieldVisible(field, model))
        .map((field) => resolveReferenceField(field, this.documentModel, model[field.key]));
    },
    itemsFor(section) {
      return sectionRecords(section.repeatable, this.sectionModel(section));
    },
    artifactFiles(section) {
      return (this.sectionModel(section)[section.repeatable.dataKey] || [])
        .map((record) => record[section.repeatable.artifactField]).filter(Boolean);
    },
    addArtifacts(section, files) {
      const records = this.sectionModel(section)[section.repeatable.dataKey];
      for (const file of files) {
        records.push(createRepeaterItem(section.repeatable, nextNumericId(records), {
          title: file.title, [section.repeatable.artifactField]: file
        }));
      }
    },
    itemTitle(section, item, index) {
      const displayId = section.repeatable.displayId;
      return displayId
        ? formatRecordDisplayId(displayId, item, index)
        : `${section.repeatable.itemLabel} ${index + 1}`;
    },
    promptFor(section) {
      const prompt = buildSectionPrompt(this.pageSchema, section, this.dataModel, this.documentModel);
      return addEvidenceContextToPrompt(
        prompt,
        this.pageSchema.evidence,
        this.documentModel,
        this.documentSchemas
      );
    },
    removeItem(section, item) {
      const items = this.sectionModel(section)[section.repeatable.dataKey];
      if (section.repeatable.stableIds) {
        item._retired = true;
        return;
      }

      const index = items.indexOf(item);
      if (index >= 0) {
        items.splice(index, 1);
      }
    },
    sectionModel(section) {
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
            <diagram-upload-control
              v-if="section.repeatable.artifactField"
              :key="pageSchema.id + section.id"
              class="mt-3"
              :files="artifactFiles(section)"
              :multiple="true"
              label="Upload diagram files"
              @uploaded="addArtifacts(section, $event)"
            ></diagram-upload-control>
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
              @update:model-value="sectionModel(section)[field.key] = $event"
            ></schema-field>
          </div>
        </div>
      </section>
    </form>
  `
};

export const FormProgress = {
  components: { CopyPromptControl },
  emits: ["copy-markdown"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object, required: true },
    documentModel: { type: Object, default: () => ({}) },
    documentSchemas: { type: Array, default: () => [] },
    pageSchema: { type: Object, required: true }
  },
  computed: {
    copyKey() {
      return `${this.pageSchema.id}:interview`;
    },
    interviewPrompt() {
      const prompt = buildInterviewPrompt(this.pageSchema, this.dataModel, this.documentModel);
      return addEvidenceContextToPrompt(
        prompt,
        this.pageSchema.evidence,
        this.documentModel,
        this.documentSchemas
      );
    },
    percent() {
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
        <copy-prompt-control
          button-class="completion-copy-trigger"
          :copied="copiedSection === copyKey"
          :label="'Copy the ' + pageSchema.title + ' AI interview prompt'"
          tooltip="Copies an AI interview prompt for this tab’s missing answers, followed by an inventory and handoff to field prompts."
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
};
