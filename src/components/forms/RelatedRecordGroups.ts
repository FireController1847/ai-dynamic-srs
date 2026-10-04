import type { CopyRequest, DataModel, DocumentModel, ParentChoice, ParentConfig, Repeater, SchemaNode, Section } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { RelatedRecordItem } from "./RelatedRecordItem.ts";
import { SectionInfo } from "../controls/FormControls.ts";
import { dataModelForSection, mutableRecords } from "../../core/schema/data-models.ts";
import { sectionRecords } from "../../core/schema/section-records.ts";
import { createRepeaterItem } from "../../core/schema/state-factory.ts";
import { hasNonDefaultValue } from "../../core/records/record-values.ts";
import { nextRepeaterRecordId, removeRepeaterRecord } from "../../core/records/record-lifecycle.ts";
import { parentRecordGroups, parentScopedSection } from "../../core/records/parent-records.ts";
import { buildFormPrompt } from "../../core/ai/prompt-builder.ts";
import { addEvidenceContextToPrompt } from "../../core/ai/evidence-context.ts";
import type { FieldPromptFactory } from '../controls/FormControls.ts';

type ParentSection = Section & { repeatable: Repeater & { parent: ParentConfig } };

export const RelatedRecordGroups = defineComponent({
  components: { RelatedRecordItem, SectionInfo },
  emits: ["copy-markdown"],
  props: {
    section: { type: Object as PropType<ParentSection>, required: true }, pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    dataModel: { type: Object as PropType<DataModel>, required: true }, documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, default: () => [] }, copiedSection: { type: String, default: "" },
    periods: { type: Number, default: 0 }
  },
  computed: {
    config(): ParentConfig { return this.section.repeatable.parent; },
    sectionModel(): DataModel { return dataModelForSection(this.section, this.dataModel, this.documentModel); },
    model(): ReturnType<typeof parentRecordGroups> { return parentRecordGroups(this.section.repeatable, this.sectionModel, this.documentModel); },
    idBase(): string { return `${this.pageSchema.id}-${this.section.id}`; },
    removable(): boolean {
      return this.section.repeatable.allowRemove !== false
        && sectionRecords(this.section.repeatable, this.sectionModel).length > (this.section.repeatable.minimum || 0);
    }
  },
  methods: {
    add(value: string) {
      if (!value && !this.config.allowUngrouped) return;
      if (value && !this.model.parents.some(parent => parent.value === value)) return;
      const repeater = this.section.repeatable;
      const records = mutableRecords(this.sectionModel, repeater.dataKey);
      const empty = sectionRecords(repeater, this.sectionModel).find(item => !item[this.config.fieldKey]
        && repeater.fields.every(field => !hasNonDefaultValue(item[field.key], field.default)));
      if (empty && value) { empty[this.config.fieldKey] = value; return; }
      records.push(createRepeaterItem(repeater, nextRepeaterRecordId(repeater, records, this.documentModel), { [this.config.fieldKey]: value }));
    },
    move({ item, value }: { item: DataModel; value: string }) {
      if ((value === "" && this.config.allowUngrouped) || this.model.parents.some(parent => parent.value === value)) item[this.config.fieldKey] = value;
    },
    saveRelationship({ item, value }: { item: DataModel; value: string }) {
      if (this.config.preserveFreeform) item[this.config.fieldKey] = value;
    },
    remove(item: DataModel) {
      if (!this.removable) return;
      const items = mutableRecords(this.sectionModel, this.section.repeatable.dataKey);
      removeRepeaterRecord(this.section.repeatable, items, item, this.documentModel);
    },
    copyKey(parent: ParentChoice) { return `${this.pageSchema.id}:${this.section.key}-parent-${parent.value}`; },
    prompt(parent: ParentChoice) {
      const section = parentScopedSection(this.section, parent);
      return addEvidenceContextToPrompt(buildFormPrompt(this.pageSchema, section, this.dataModel, this.documentModel), this.pageSchema.evidence, this.documentModel, this.documentSchemas);
    },
    recordSection(item: DataModel): Section {
      const parent = this.model.parents.find(candidate => candidate.value === item[this.config.fieldKey]);
      return parent ? parentScopedSection(this.section, parent) : this.section;
    },
    recordPrompt(item: DataModel, fieldPath: readonly (string | number)[] = []): CopyRequest {
      const form = this;
      return {
        get markdown() {
          const prompt = buildFormPrompt(form.pageSchema, form.recordSection(item), form.dataModel, form.documentModel, { record: item, fieldPath });
          return addEvidenceContextToPrompt(prompt, form.pageSchema.evidence, form.documentModel, form.documentSchemas);
        },
        title: `${this.section.title} — ${item.id}${fieldPath.length ? ' — ' + fieldPath.join(' / ') : ''}`,
        key: `${this.pageSchema.id}:${this.section.key}:record-${item.id}:${JSON.stringify(fieldPath)}`
      };
    },
    fieldPromptFactory(item: DataModel): FieldPromptFactory {
      return path => this.recordPrompt(item, path);
    }
  },
  template: `
    <div class="mt-3">
      <p class="small text-body-secondary">{{ config.description || 'Add records beneath their related item. The form assigns that link automatically.' }}</p>
      <p v-if="!model.parents.length" class="small">{{ config.emptyText || 'Create a related record in its source catalog first.' }}</p>
      <details v-for="group in model.groups" :key="group.value" class="border rounded p-3 mt-3" :open="group.items.length > 0">
        <summary>{{ group.label }} <small class="text-body-secondary">{{ group.value }} · {{ group.items.length }} records</small></summary>
        <div class="d-flex align-items-center justify-content-between gap-2 mt-3">
          <section-info :title="section.title + ' for ' + group.label" :help="section.help" :copy-key="copyKey(group)"
            :copy-text="prompt(group)" :copied="copiedSection === copyKey(group)" @copy-markdown="$emit('copy-markdown', $event)"></section-info>
          <button v-if="section.repeatable.allowAdd !== false" type="button" class="btn btn-outline-primary btn-sm" @click="add(group.value)">{{ section.repeatable.addLabel }}</button>
        </div>
        <related-record-item v-for="item in group.items" :key="item.id" :item="item" :section="section" :document-model="documentModel"
          :parents="model.parents" :id-base="idBase" :periods="periods" :removable="removable"
          :record-prompt="recordPrompt(item)" :copy-prompt="fieldPromptFactory(item)" :copied-section="copiedSection"
          @copy-markdown="$emit('copy-markdown', $event)" @move="move" @remove="remove"></related-record-item>
      </details>
      <div v-if="model.ungrouped.length || config.allowUngrouped" class="border rounded p-3 mt-3">
        <div class="d-flex align-items-center justify-content-between gap-2">
          <h4 class="h6 mb-0">{{ config.ungroupedTitle || 'Records needing a related item' }}</h4>
          <button v-if="config.allowUngrouped && section.repeatable.allowAdd !== false" type="button" class="btn btn-outline-primary btn-sm" @click="add('')">{{ config.ungroupedAddLabel || section.repeatable.addLabel }}</button>
        </div>
        <p class="small text-body-secondary mt-2">{{ config.ungroupedDescription || 'These saved records have missing or unavailable links. Choose a related record by name; their IDs and answers are preserved.' }}</p>
        <related-record-item v-for="item in model.ungrouped" :key="item.id" :item="item" :section="section" :document-model="documentModel"
          :parents="model.parents" :id-base="idBase" :periods="periods" :ungrouped="true" :removable="removable"
          :record-prompt="recordPrompt(item)" :copy-prompt="fieldPromptFactory(item)" :copied-section="copiedSection"
          @copy-markdown="$emit('copy-markdown', $event)" @move="move" @remove="remove" @relationship="saveRelationship"></related-record-item>
      </div>
    </div>
  `
});
