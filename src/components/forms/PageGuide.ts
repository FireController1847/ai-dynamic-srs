import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const PageGuide = defineComponent({
  props: {
    pageSchema: { type: Object as PropType<SchemaNode>, required: true }
  },
  template: `
    <details v-if="pageSchema.guide" class="page-guide card border-0 shadow-sm mb-4" :open="pageSchema.guide.collapsed === false">
      <summary class="page-guide-summary">
        <span class="page-guide-icon" aria-hidden="true">?</span>
        <span>
          <strong>{{ pageSchema.guide.title }}</strong>
          <small>{{ pageSchema.guide.summary }}</small>
        </span>
      </summary>
      <div class="page-guide-body">
        <p v-for="paragraph in pageSchema.guide.paragraphs" :key="paragraph" class="page-guide-paragraph">{{ paragraph }}</p>
        <ol v-if="pageSchema.guide.steps?.length" class="page-guide-steps">
          <li v-for="step in pageSchema.guide.steps" :key="step.title">
            <strong>{{ step.title }}</strong>
            <span>{{ step.text }}</span>
          </li>
        </ol>
        <div v-if="pageSchema.guide.terms?.length" class="page-guide-glossary">
          <h3 class="h6">{{ pageSchema.guide.termsTitle || "Terms used on this tab" }}</h3>
          <dl>
            <div v-for="item in pageSchema.guide.terms" :key="item.term">
              <dt>{{ item.term }}</dt>
              <dd>{{ item.definition }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </details>
  `
});
