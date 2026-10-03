import { narrativeMarkdown } from "../../core/formatting/markdown.js";
import { DateField } from "./DateField.js";
import { RecordLinksField } from "./RecordLinksField.js";
import { createNestedItem } from "../../core/schema/state-factory.js";
import { nextNumericId, displayValue } from "../../core/records/record-values.js";
import { DiagramFileField } from "../diagrams/DiagramFileField.js";

export const SchemaField = {
  name: "SchemaField",
  components: { DiagramFileField, RecordLinksField, DateField },
  emits: ["update:modelValue"],
  props: {
    field: { type: Object, required: true },
    idBase: { type: String, required: true },
    modelValue: { required: false },
    periods: { type: Number, default: 0 },
    documentModel: { type: Object, default: () => ({}) }
  },
  methods: {
    narrativeMarkdown,
    readOnlyValue() {
      const option = this.field.options?.find((candidate) => this.optionValue(candidate) === this.modelValue);
      return option ? this.optionLabel(option) : displayValue(this.modelValue);
    },
    optionLabel(option) {
      return typeof option === "object" ? option.label : option;
    },
    optionValue(option) {
      return typeof option === "object" ? option.value : option;
    },
    optionId(option) {
      return `${this.idBase}-${String(this.optionValue(option)).toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
    },
    addNestedItem() {
      const records = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
      const nextId = nextNumericId(records);
      records.push(createNestedItem(this.field, nextId));
      this.$emit("update:modelValue", records);
    },
    nestedItemTitle(index) {
      return `${this.field.itemLabel || "Item"} ${index + 1}`;
    },
    nestedPrimaryFields() {
      return (this.field.fields || []).filter((field) => !field.advanced);
    },
    nestedAdvancedFields() {
      return (this.field.fields || []).filter((field) => field.advanced);
    },
    removeNestedItem(index) {
      const records = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
      records.splice(index, 1);
      this.$emit("update:modelValue", records);
    },
    updateNestedValue(recordIndex, key, value) {
      const records = Array.isArray(this.modelValue)
        ? this.modelValue.map((record) => ({ ...record }))
        : [];
      records[recordIndex][key] = value;
      this.$emit("update:modelValue", records);
    },
    toggleOption(option, checked) {
      const optionValue = this.optionValue(option);
      const values = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
      const nextValues = checked
        ? [...new Set([...values, optionValue])]
        : values.filter((value) => value !== optionValue);
      this.$emit("update:modelValue", nextValues);
    },
    updatePeriodValue(index, value) {
      const values = Array.isArray(this.modelValue) ? [...this.modelValue] : [];
      values[index] = value;
      this.$emit("update:modelValue", values);
    }
  },
  template: `
    <div :class="field.columns || 'col-12'">
      <details v-if="field.optional && !field.dateDocument" :open="!!modelValue">
        <summary><span v-if="narrativeMarkdown(field) && field.editable !== false" class="markdown-field-badge" title="Markdown supported" aria-label="Markdown supported">M↓</span>{{ field.label }}</summary>
        <schema-field :field="{ ...field, optional: false, hideLabel: true }" :id-base="idBase" :model-value="modelValue" :document-model="documentModel" :periods="periods" @update:model-value="$emit('update:modelValue', $event)"></schema-field>
      </details>
      <template v-else-if="field.editable === false">
        <p class="form-label mb-1" :class="{ 'visually-hidden': field.hideLabel }">{{ field.label }}</p>
        <p class="form-control-plaintext preserve-lines">{{ readOnlyValue() }}</p>
      </template>
      <date-field v-else-if="field.type === 'date'" :field="field" :id-base="idBase" :model-value="modelValue" :document-model="documentModel" @update:model-value="$emit('update:modelValue', $event)"></date-field>
      <record-links-field v-else-if="field.type === 'record-links'" :field="field" :model-value="modelValue" :document-model="documentModel" :id-base="idBase" @update:model-value="$emit('update:modelValue', $event)"></record-links-field>
      <diagram-file-field v-else-if="field.type === 'diagram-file'" :field="field" :model-value="modelValue" :document-model="documentModel" @update:model-value="$emit('update:modelValue', $event)"></diagram-file-field>
      <fieldset v-else-if="field.type === 'nested-records'" class="nested-records-field">
        <legend class="visually-hidden">{{ field.label }}</legend>
        <div class="nested-records-heading">
          <div>
            <p class="form-label mb-1" :class="{ 'visually-hidden': field.hideLabel }">{{ field.label }}</p>
            <p v-if="field.description" class="nested-records-description mb-0">{{ field.description }}</p>
          </div>
          <button class="btn btn-outline-primary btn-sm" type="button" @click="addNestedItem">{{ field.addLabel || 'Add item' }}</button>
        </div>
        <div v-if="Array.isArray(modelValue) && modelValue.length" class="nested-records-list">
          <article v-for="(record, recordIndex) in modelValue" :key="record.id" class="nested-record-card">
            <header class="nested-record-card-heading">
              <h5 class="mb-0">{{ nestedItemTitle(recordIndex) }}</h5>
              <button
                v-if="modelValue.length > (field.minimum || 0)"
                class="btn btn-link btn-sm text-danger p-0"
                type="button"
                @click="removeNestedItem(recordIndex)"
              >Remove</button>
            </header>
            <div class="row g-3">
              <schema-field
                v-for="nestedField in nestedPrimaryFields()"
                :key="nestedField.key"
                :field="nestedField"
                :id-base="idBase + '-' + record.id + '-' + nestedField.key"
                :model-value="record[nestedField.key]"
                :periods="periods"
                @update:model-value="updateNestedValue(recordIndex, nestedField.key, $event)"
              ></schema-field>
              <div v-if="nestedAdvancedFields().length" class="col-12">
                <details class="nested-record-advanced">
                  <summary>More citation details</summary>
                  <div class="row g-3 pt-3">
                    <schema-field
                      v-for="nestedField in nestedAdvancedFields()"
                      :key="nestedField.key"
                      :field="nestedField"
                      :id-base="idBase + '-' + record.id + '-' + nestedField.key"
                      :model-value="record[nestedField.key]"
                      :periods="periods"
                      @update:model-value="updateNestedValue(recordIndex, nestedField.key, $event)"
                    ></schema-field>
                  </div>
                </details>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="nested-records-empty mb-0">{{ field.emptyText || 'No items have been added.' }}</p>
      </fieldset>
      <fieldset v-else-if="field.type === 'checkbox-group'">
        <legend class="form-label" :class="{ 'visually-hidden': field.hideLabel }">{{ field.label }}</legend>
        <div class="row g-2">
          <div v-for="option in field.options" :key="optionValue(option)" class="col-sm-6 col-xl-4">
            <div class="form-check discovery-option">
              <input
                :id="optionId(option)"
                class="form-check-input"
                type="checkbox"
                :value="optionValue(option)"
                :checked="Array.isArray(modelValue) && modelValue.includes(optionValue(option))"
                @change="toggleOption(option, $event.target.checked)"
              >
              <label class="form-check-label" :for="optionId(option)">{{ optionLabel(option) }}</label>
            </div>
          </div>
        </div>
      </fieldset>
      <fieldset v-else-if="field.type === 'period-values'">
        <legend class="form-label" :class="{ 'visually-hidden': field.hideLabel }">{{ field.label }}</legend>
        <div class="period-value-grid">
          <label v-for="period in periods" :key="period" class="period-value-field">
            <span>Year {{ period }}</span>
            <input
              class="form-control"
              type="number"
              :min="field.min"
              :max="field.max"
              :step="field.step || 'any'"
              :value="Array.isArray(modelValue) ? modelValue[period - 1] : ''"
              @input="updatePeriodValue(period - 1, $event.target.value)"
            >
          </label>
        </div>
      </fieldset>
      <template v-else>
        <label class="form-label" :class="{ 'visually-hidden': field.hideLabel }" :for="idBase"><span v-if="narrativeMarkdown(field) && field.editable !== false" class="markdown-field-badge" title="Markdown supported" aria-label="Markdown supported">M↓</span>{{ field.label }}</label>
        <textarea
          v-if="field.type === 'textarea'"
          :id="idBase"
          class="form-control"
          :rows="field.rows || 3"
          :placeholder="field.placeholder || ''"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        ></textarea>
        <select
          v-else-if="field.type === 'select'"
          :id="idBase"
          class="form-select"
          :value="modelValue"
          @change="$emit('update:modelValue', $event.target.value)"
        >
          <option v-if="field.placeholder" value="" disabled>{{ field.placeholder }}</option>
          <option v-for="option in field.options" :key="optionValue(option)" :value="optionValue(option)">{{ optionLabel(option) }}</option>
        </select>
        <input
          v-else
          :id="idBase"
          class="form-control"
          :type="['date', 'number', 'url'].includes(field.type) ? field.type : 'text'"
          :min="field.min"
          :max="field.max"
          :step="field.step || (field.type === 'number' ? 'any' : undefined)"
          :placeholder="field.placeholder || ''"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
        >
      </template>
      <div v-if="field.helpText" class="form-text field-help-text">{{ field.helpText }}</div>
    </div>
  `
};
