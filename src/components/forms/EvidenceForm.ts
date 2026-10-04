import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { DynamicForm } from "./FormWorkspace.ts";
import { WorkspaceEvidencePanel } from "../references/WorkspaceEvidencePanel.ts";

export const evidenceFormProps = {
  copiedSection: { type: String, default: "" },
  dataModel: { type: Object as PropType<DataModel>, required: true },
  documentModel: { type: Object as PropType<DocumentModel>, required: true },
  documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
  pageSchema: { type: Object as PropType<SchemaNode>, required: true }
};

export const EvidenceForm = defineComponent({
  name: "EvidenceForm",
  components: { DynamicForm, WorkspaceEvidencePanel },
  emits: ["copy-markdown", "navigate-workspace"],
  props: evidenceFormProps,
  template: `
    <div>
      <workspace-evidence-panel
        v-if="pageSchema.evidence"
        :document-model="documentModel"
        :document-schemas="documentSchemas"
        :evidence="pageSchema.evidence"
        @navigate-workspace="$emit('navigate-workspace', $event)"
      ></workspace-evidence-panel>
      <slot name="review"></slot>
      <dynamic-form
        :page-schema="pageSchema"
        :data-model="dataModel"
        :document-model="documentModel"
        :document-schemas="documentSchemas"
        :copied-section="copiedSection"
        @copy-markdown="$emit('copy-markdown', $event)"
      ></dynamic-form>
    </div>
  `
});
