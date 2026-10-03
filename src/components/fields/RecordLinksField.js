import { referenceChoices } from '../../core/records/reference-fields.js';
export const RecordLinksField = {
  props: { field: Object, modelValue: {}, documentModel: Object, idBase: String },
  emits: ['update:modelValue'],
  computed: {
    selected() { return String(this.modelValue || '').split(/[,;]\s*/).map(s => s.trim()).filter(Boolean); },
    choices() {
      const options = (this.field.references || [this.field.reference]).filter(Boolean)
        .flatMap(reference => referenceChoices(reference, this.documentModel));
      return [...new Map(options.map(option => [option.value, option])).values()];
    },
    unavailable() { return this.selected.filter(value => !this.choices.some(option => option.value === value)); }
  },
  methods: {
    toggle(value, enabled) {
      const values = enabled ? [...new Set([...this.selected, value])] : this.selected.filter(item => item !== value);
      this.$emit('update:modelValue', values.join(', '));
    }
  },
  template: `<fieldset><legend class="form-label" :class="{ 'visually-hidden': field.hideLabel }">{{ field.label }}</legend>
    <details><summary>{{ selected.length }} linked — choose by name</summary>
      <label v-for="option in choices" :key="option.value" class="d-block small mt-2">
        <input type="checkbox" :checked="selected.includes(option.value)" @change="toggle(option.value, $event.target.checked)"> {{ option.label }}
      </label>
      <div v-for="value in unavailable" :key="value" class="small mt-2">{{ value }} — retained source or unavailable link
        <button type="button" class="btn btn-link btn-sm" @click="toggle(value, false)">Remove link</button></div>
      <p v-if="!choices.length" class="small">No records available yet.</p>
    </details></fieldset>`
};
