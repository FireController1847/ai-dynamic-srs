import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { isDataModel, recordItems, valueAtPath } from "../../core/schema/data-models.ts";
import { diagramPayloadError } from "../../core/artifacts/diagram-files.ts";
import { DiagramUploadControl } from "./DiagramUploadControl.ts";
import { DiagramMedia } from "./DiagramMedia.ts";

export const DiagramFileField = defineComponent({
  name: "DiagramFileField",
  components: { DiagramUploadControl, DiagramMedia },
  emits: ["update:modelValue"],
  props: {
    field: { type: Object as PropType<Field>, required: true }, modelValue: { type: Object as PropType<DataModel | null>, default: null },
    documentModel: { type: Object as PropType<DocumentModel>, default: () => ({}) }
  },
  data() { return { showPreview: false }; },
  computed: {
    files(): DataModel[] {
      const records = valueAtPath(this.documentModel, this.field.collectionPath || []);
      const artifactField = typeof this.field.artifactField === "string" ? this.field.artifactField : "file";
      return recordItems(records).map((record) => record[artifactField]).filter(isDataModel);
    },
    downloadable(): boolean { return isDataModel(this.modelValue) && !diagramPayloadError(this.modelValue); }
  },
  methods: {
    download() {
      const file = isDataModel(this.modelValue) ? this.modelValue : null;
      if (!file || diagramPayloadError(file)) return;
      const drawio = file.artifactKind === "DrawIO source";
      const content = String(file.content || "");
      const href = drawio ? URL.createObjectURL(new Blob([content], { type: "application/xml" })) : content;
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = String(file.sourceFileName || (drawio ? "diagram.drawio" : "diagram.png"));
      anchor.click();
      if (drawio) setTimeout(() => URL.revokeObjectURL(href), 1000);
    }
  },
  template: `
    <div>
      <p class="form-label">{{ field.label }}</p>
      <div class="d-flex flex-wrap gap-3 align-items-start">
        <diagram-upload-control :files="files" :replacing="modelValue" :label="modelValue ? 'Replace file (keep figure ID)' : 'Upload diagram'" @uploaded="$emit('update:modelValue', $event[0])"></diagram-upload-control>
        <button v-if="downloadable" class="btn btn-outline-secondary btn-sm" type="button" @click="download">Download source</button>
      </div>
      <p v-if="modelValue" class="small text-body-secondary mt-2">{{ modelValue.sourceFileName }}</p>
      <p class="small text-body-secondary mt-2">DrawIO previews load the diagrams.net viewer online. For a multi-page file, the page selected in the document preview is the page printed.</p>
      <details v-if="modelValue" class="mt-2" @toggle="showPreview = $event.target.open">
        <summary>Inspect file preview</summary>
        <diagram-media v-if="showPreview" :file="modelValue" :title="modelValue.title || field.label"></diagram-media>
      </details>
    </div>
  `
});
