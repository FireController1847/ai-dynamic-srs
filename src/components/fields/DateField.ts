import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { localIsoDate, documentDate } from '../../core/formatting/document-dates.ts';
export const DateField = defineComponent({
  props: { field: { type: Object as PropType<Field>, required: true }, idBase: String, modelValue: { type: null as unknown as PropType<unknown>,}, documentModel: { type: Object as PropType<DocumentModel>, required: true } },
  emits: ['update:modelValue'],
  computed: {
    automaticDate(): unknown { return this.field.dateDocument ? documentDate(this.documentModel?.[this.field.dateDocument], '__automaticDate') : ''; },
    effectiveDate(): unknown { return this.modelValue || this.automaticDate; }
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
});
