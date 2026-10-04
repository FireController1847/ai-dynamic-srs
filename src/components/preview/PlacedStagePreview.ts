import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { placedPreviewModel } from "../../core/schema/placed-preview.ts";
import { DocumentPreview } from "./DocumentPreview.ts";

export const PlacedStagePreview = defineComponent({
  name: "PlacedStagePreview",
  inheritAttrs: false,
  components: { DocumentPreview },
  emits: ["print"],
  props: {
    dataModel: { type: Object as PropType<DataModel>, required: true },
    documentConfig: { type: Object as PropType<DocumentConfig | null>, required: true },
    documentModel: { type: Object as PropType<DocumentModel>, required: true },
    pageSchema: { type: Object as PropType<SchemaNode>, required: true },
    projectContext: { type: Object as PropType<DataModel>, required: true },
    printDateLabel: { type: String, required: true },
    printPageId: { type: String, required: true },
    isPrinting: { type: Boolean, default: false },
    sectionContext: { type: Object as PropType<SectionContext | null>, default: null }
  },
  computed: {
    previewModel(): ReturnType<typeof placedPreviewModel> {
      const config = this.documentConfig || {};
      return placedPreviewModel(this.pageSchema, this.dataModel, this.documentModel, {
        ...config,
        title: this.sectionContext?.documentTitle || this.pageSchema.title
      });
    },
    previewData(): DataModel {
      const dateDocument = this.documentConfig?.dateDocument;
      const datedDocument = dateDocument ? this.documentModel[dateDocument] : undefined;
      return {
        ...this.previewModel.data,
        _lastModified: datedDocument?._lastModified,
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
});
