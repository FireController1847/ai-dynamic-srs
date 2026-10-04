import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { SchemaField } from "../fields/SchemaField.ts";
import { fieldVisible } from "../../core/schema/field-visibility.ts";
import { resolveReferenceField } from "../../core/records/reference-fields.ts";
import { formatRecordDisplayId } from "../../core/records/record-values.ts";

type ParentSection = Section & { repeatable: Repeater & { parent: ParentConfig } };

export const RelatedRecordItem = defineComponent({
  components: { SchemaField },
  emits: ["move", "remove", "relationship"],
  props: {
    item: { type: Object as PropType<DataModel>, required: true }, section: { type: Object as PropType<ParentSection>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, required: true }, parents: { type: Array as PropType<ParentChoice[]>, required: true },
    idBase: { type: String, required: true }, periods: { type: Number, default: 0 },
    ungrouped: { type: Boolean, default: false }, removable: { type: Boolean, default: true }
  },
  data() { return { relationshipDraft: String(this.item[this.section.repeatable.parent.fieldKey] || "") }; },
  watch: {
    currentParent(value: string) { this.relationshipDraft = value; }
  },
  computed: {
    config(): ParentConfig { return this.section.repeatable.parent; },
    referenceId(): string { return formatRecordDisplayId(this.section.repeatable.displayId, this.item); },
    currentParent(): string { return String(this.item[this.config.fieldKey] || ""); },
    parentKnown(): boolean { return this.parents.some(parent => parent.value === this.currentParent); },
    fields(): Field[] {
      return this.section.repeatable.fields.filter(field => !field.hidden && fieldVisible(field, this.item)
        && field.key !== this.config.fieldKey)
        .map(field => resolveReferenceField(field, this.documentModel, this.item[field.key]));
    }
  },
  template: `
    <article class="border rounded p-3 mt-3">
      <div class="d-flex align-items-center justify-content-between mb-3 gap-2">
        <h5 class="h6 mb-0">{{ referenceId }}</h5>
        <button v-if="removable" type="button" class="btn btn-link btn-sm text-danger" @click="$emit('remove', item)">Remove {{ section.repeatable.itemLabel.toLowerCase() }}</button>
      </div>
      <div class="row g-3">
        <schema-field v-for="field in fields" :key="field.key" :field="field" :document-model="documentModel"
          :id-base="idBase + '-' + item.id + '-' + field.key" :model-value="item[field.key]" :periods="periods"
          @update:model-value="item[field.key] = $event"></schema-field>
      </div>
      <div v-if="ungrouped && config.preserveFreeform" class="mt-3">
        <label class="form-label" :for="idBase + '-' + item.id + '-relationship'">{{ config.relationshipLabel || 'Existing relationship' }}</label>
        <textarea class="form-control" :id="idBase + '-' + item.id + '-relationship'" v-model="relationshipDraft" rows="2"></textarea>
        <button type="button" class="btn btn-outline-secondary btn-sm mt-2" @click="$emit('relationship', { item, value: relationshipDraft })">Save relationship</button>
      </div>
      <details class="mt-3" :open="ungrouped">
        <summary class="small">{{ ungrouped ? 'Choose ' + config.label.toLowerCase() : 'Move to another ' + config.label.toLowerCase() }}</summary>
        <label class="form-label mt-2" :for="idBase + '-' + item.id + '-parent'">{{ config.label }} for {{ referenceId }}</label>
        <select class="form-select" :id="idBase + '-' + item.id + '-parent'" :value="currentParent"
          @change="$emit('move', { item, value: $event.target.value })">
          <option value="" :disabled="!config.allowUngrouped">{{ config.allowUngrouped ? (config.unassignedOption || 'No single parent') : 'Choose a record' }}</option>
          <option v-if="currentParent && !parentKnown" :value="currentParent" disabled>Existing link: {{ currentParent }}</option>
          <option v-for="parent in parents" :key="parent.value" :value="parent.value">{{ parent.label }} — {{ parent.value }}</option>
        </select>
        <p v-if="ungrouped && currentParent && !parentKnown" class="small text-body-secondary mt-2">The saved link is retained. Choosing a record replaces it; it does not change this item's ID or other answers.</p>
      </details>
    </article>
  `
});
