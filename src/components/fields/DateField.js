import { localIsoDate, documentDate } from '../../core/formatting/document-dates.js';
export const DateField = {
  props: { field: Object, idBase: String, modelValue: {}, documentModel: Object },
  emits: ['update:modelValue'],
  computed: {
    automaticDate() { return this.field.dateDocument ? documentDate(this.documentModel?.[this.field.dateDocument], '__automaticDate') : ''; },
    effectiveDate() { return this.modelValue || this.automaticDate; }
  },
  methods: { today() { this.$emit('update:modelValue', localIsoDate()); } },
  template: `<div>
    <label class="form-label" :class="{ 'visually-hidden': field.hideLabel }" :for="idBase">{{ field.label }}</label>
    <div class="d-flex align-items-center gap-2">
      <input type="date" class="form-control" :id="idBase" :value="effectiveDate" :aria-describedby="field.dateDocument ? idBase + '-mode' : undefined" @input="$emit('update:modelValue', $event.target.value)">
      <button type="button" class="btn btn-outline-secondary btn-sm" @click="today">Today</button>
      <button v-if="field.dateDocument && modelValue" type="button" class="btn btn-link btn-sm" @click="$emit('update:modelValue', '')">Auto</button>
    </div>
    <div v-if="field.dateDocument" :id="idBase + '-mode'" class="form-text">{{ modelValue ? 'Manual date' : 'Automatic · last document edit' }}</div>
  </div>`
};
