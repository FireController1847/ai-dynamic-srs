import { placedPreviewModel } from "../../core/schema/placed-preview.js";
import { DocumentPreview } from "./DocumentPreview.js";

export const PlacedStagePreview = {
  name: "PlacedStagePreview",
  inheritAttrs: false,
  components: { DocumentPreview },
  emits: ["print"],
  props: {
    dataModel: { type: Object, required: true },
    documentConfig: { type: Object, required: true },
    documentModel: { type: Object, required: true },
    pageSchema: { type: Object, required: true },
    projectContext: { type: Object, required: true },
    printDateLabel: { type: String, required: true },
    printPageId: { type: String, required: true },
    isPrinting: { type: Boolean, default: false },
    sectionContext: { type: Object, default: null }
  },
  computed: {
    previewModel() {
      return placedPreviewModel(this.pageSchema, this.dataModel, this.documentModel, {
        ...this.documentConfig,
        title: this.sectionContext?.documentTitle || this.pageSchema.title
      });
    },
    previewData() {
      return {
        ...this.previewModel.data,
        _lastModified: this.documentModel[this.documentConfig.dateDocument]?._lastModified,
        documentStatus: "Working partial",
        version: this.previewModel.data.version || "0.1"
      };
    }
  },
  template: `
    <document-preview
      :page-schema="previewModel.page"
      :document-config="documentConfig"
      :data-model="previewData"
      :project-context="projectContext"
      :print-date-label="printDateLabel"
      :is-printing="isPrinting"
      :print-page-id="printPageId"
      :partial="true"
      @print="$emit('print', $event)"
    ></document-preview>
  `
};
