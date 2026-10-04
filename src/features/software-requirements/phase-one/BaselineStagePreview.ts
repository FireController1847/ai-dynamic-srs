import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../../core/schema/schema-types.ts';
import { DocumentPreview } from "../../../components/preview/DocumentPreview.ts";
import { baselinePreviewModel } from "./preview-model.ts";

export const BaselineStagePreview = defineComponent({
  name: "BaselineStagePreview",
  inheritAttrs: false,
  components: { DocumentPreview },
  emits: ["print"],
  props: {
    dataModel: { type: Object as PropType<DataModel>, required: true },
    documentConfig: { type: Object as PropType<DocumentConfig | null>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    documentSchemas: { type: Array as PropType<SchemaNode[]>, required: true },
    isPrinting: { type: Boolean, default: false },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    printDateLabel: { type: String, required: true },
    printPageId: { type: String, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true }
  },
  computed: {
    previewData(): DataModel {
      return {
        ...this.previewModel.data,
        _lastModified: this.documentModel.softwareRequirementsSpecification?._lastModified,
        documentStatus: "Working partial",
        issueDate: this.previewModel.data.issueDate || "",
        version: this.previewModel.data.version || "0.1"
      };
    },
    previewModel(): ReturnType<typeof baselinePreviewModel> {
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
});
