import { DocumentPreview } from "../../../components/preview/DocumentPreview.js";
import { baselinePreviewModel } from "./preview-model.js";

export const BaselineStagePreview = {
  name: "BaselineStagePreview",
  inheritAttrs: false,
  components: { DocumentPreview },
  emits: ["print"],
  props: {
    dataModel: { type: Object, required: true },
    documentConfig: { type: Object, required: true },
    documentModel: { type: Object, required: true },
    documentSchemas: { type: Array, required: true },
    isPrinting: { type: Boolean, default: false },
    pageSchema: { type: Object, required: true },
    printDateLabel: { type: String, required: true },
    printPageId: { type: String, required: true },
    projectContext: { type: Object, required: true }
  },
  computed: {
    previewData() {
      return {
        ...this.previewModel.data,
        _lastModified: this.documentModel.softwareRequirementsSpecification?._lastModified,
        documentStatus: "Working partial",
        issueDate: this.previewModel.data.issueDate || "",
        version: this.previewModel.data.version || "0.1"
      };
    },
    previewModel() {
      return baselinePreviewModel(
        this.pageSchema,
        this.dataModel,
        this.documentModel,
        this.documentSchemas
      );
    }
  },
  template: `
    <document-preview
      :page-schema="previewModel.page"
      :document-config="documentConfig"
      :data-model="previewData"
      :document-model="previewData"
      :project-context="projectContext"
      :print-date-label="printDateLabel"
      :is-printing="isPrinting"
      :print-page-id="printPageId"
      :partial="true"
      @print="$emit('print', $event)"
    ></document-preview>
  `
};
