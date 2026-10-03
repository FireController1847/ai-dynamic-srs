import { RelatedRecordItem } from "./RelatedRecordItem.js";
import { SectionInfo } from "../controls/FormControls.js";
import { dataModelForSection } from "../../core/schema/data-models.js";
import { sectionRecords } from "../../core/schema/section-records.js";
import { createRepeaterItem } from "../../core/schema/state-factory.js";
import { nextNumericId, hasNonDefaultValue } from "../../core/records/record-values.js";
import { parentRecordGroups, parentScopedSection } from "../../core/records/parent-records.js";
import { buildSectionPrompt } from "../../core/ai/prompt-builder.js";
import { addEvidenceContextToPrompt } from "../../core/ai/evidence-context.js";

export const RelatedRecordGroups = {
  components: { RelatedRecordItem, SectionInfo },
  emits: ["copy-markdown"],
  props: {
    section: { type: Object, required: true }, pageSchema: { type: Object, required: true },
    dataModel: { type: Object, required: true }, documentModel: { type: Object, required: true },
    documentSchemas: { type: Array, default: () => [] }, copiedSection: { type: String, default: "" },
    periods: { type: Number, default: 0 }
  },
  computed: {
    config() { return this.section.repeatable.parent; },
    sectionModel() { return dataModelForSection(this.section, this.dataModel, this.documentModel); },
    model() { return parentRecordGroups(this.section.repeatable, this.sectionModel, this.documentModel); },
    idBase() { return `${this.pageSchema.id}-${this.section.id}`; },
    removable() {
      return this.section.repeatable.allowRemove !== false
        && sectionRecords(this.section.repeatable, this.sectionModel).length > (this.section.repeatable.minimum || 0);
    }
  },
  methods: {
    add(value) {
      if (!value && !this.config.allowUngrouped) return;
      if (value && !this.model.parents.some(parent => parent.value === value)) return;
      const repeater = this.section.repeatable;
      const records = this.sectionModel[repeater.dataKey];
      const empty = sectionRecords(repeater, this.sectionModel).find(item => !item[this.config.fieldKey]
        && repeater.fields.every(field => !hasNonDefaultValue(item[field.key], field.default)));
      if (empty && value) { empty[this.config.fieldKey] = value; return; }
      records.push(createRepeaterItem(repeater, nextNumericId(records), { [this.config.fieldKey]: value }));
    },
    move({ item, value }) {
      if ((value === "" && this.config.allowUngrouped) || this.model.parents.some(parent => parent.value === value)) item[this.config.fieldKey] = value;
    },
    saveRelationship({ item, value }) {
      if (this.config.preserveFreeform) item[this.config.fieldKey] = value;
    },
    remove(item) {
      if (!this.removable) return;
      // Configured shared collections use stable IDs; never cascade from parents.
      if (this.section.repeatable.stableIds) item._retired = true;
      else {
        const items = this.sectionModel[this.section.repeatable.dataKey];
        const index = items.indexOf(item);
        if (index >= 0) items.splice(index, 1);
      }
    },
    copyKey(parent) { return `${this.pageSchema.id}:${this.section.key}-parent-${parent.value}`; },
    prompt(parent) {
      const section = parentScopedSection(this.section, parent);
      return addEvidenceContextToPrompt(buildSectionPrompt(this.pageSchema, section, this.dataModel, this.documentModel), this.pageSchema.evidence, this.documentModel, this.documentSchemas);
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
          :parents="model.parents" :id-base="idBase" :periods="periods" :removable="removable" @move="move" @remove="remove"></related-record-item>
      </details>
      <div v-if="model.ungrouped.length || config.allowUngrouped" class="border rounded p-3 mt-3">
        <div class="d-flex align-items-center justify-content-between gap-2">
          <h4 class="h6 mb-0">{{ config.ungroupedTitle || 'Records needing a related item' }}</h4>
          <button v-if="config.allowUngrouped && section.repeatable.allowAdd !== false" type="button" class="btn btn-outline-primary btn-sm" @click="add('')">{{ config.ungroupedAddLabel || section.repeatable.addLabel }}</button>
        </div>
        <p class="small text-body-secondary mt-2">{{ config.ungroupedDescription || 'These saved records have missing or unavailable links. Choose a related record by name; their IDs and answers are preserved.' }}</p>
        <related-record-item v-for="item in model.ungrouped" :key="item.id" :item="item" :section="section" :document-model="documentModel"
          :parents="model.parents" :id-base="idBase" :periods="periods" :ungrouped="true" :removable="removable" @move="move" @remove="remove" @relationship="saveRelationship"></related-record-item>
      </div>
    </div>
  `
};
