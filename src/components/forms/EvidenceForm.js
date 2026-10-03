import { DynamicForm } from "./FormWorkspace.js";
import { WorkspaceEvidencePanel } from "../references/WorkspaceEvidencePanel.js";

export const EvidenceForm = {
  name: "EvidenceForm",
  components: { DynamicForm, WorkspaceEvidencePanel },
  emits: ["copy-markdown", "navigate-workspace"],
  props: {
    copiedSection: { type: String, default: "" },
    dataModel: { type: Object, required: true },
    documentModel: { type: Object, required: true },
    documentSchemas: { type: Array, required: true },
    pageSchema: { type: Object, required: true }
  },
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
};
