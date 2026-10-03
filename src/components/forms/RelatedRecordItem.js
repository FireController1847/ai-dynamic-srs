import { SchemaField } from "../fields/SchemaField.js";
import { fieldVisible } from "../../core/schema/field-visibility.js";
import { resolveReferenceField } from "../../core/records/reference-fields.js";
import { formatRecordDisplayId } from "../../core/records/record-values.js";

export const RelatedRecordItem = {
  components: { SchemaField },
  emits: ["move", "remove", "relationship"],
  props: {
    item: { type: Object, required: true }, section: { type: Object, required: true },
    documentModel: { type: Object, required: true }, parents: { type: Array, required: true },
    idBase: { type: String, required: true }, periods: { type: Number, default: 0 },
    ungrouped: { type: Boolean, default: false }, removable: { type: Boolean, default: true }
  },
  data() { return { relationshipDraft: this.item[this.section.repeatable.parent.fieldKey] || "" }; },
  watch: {
    currentParent(value) { this.relationshipDraft = value; }
  },
  computed: {
    config() { return this.section.repeatable.parent; },
    referenceId() { return formatRecordDisplayId(this.section.repeatable.displayId, this.item); },
    currentParent() { return this.item[this.config.fieldKey] || ""; },
    parentKnown() { return this.parents.some(parent => parent.value === this.currentParent); },
    fields() {
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
};
