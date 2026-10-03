import { valueAtPath } from "../../core/schema/data-models.js";
import { diagramPayloadError } from "../../core/artifacts/diagram-files.js";
import { DiagramUploadControl } from "./DiagramUploadControl.js";
import { DiagramMedia } from "./DiagramMedia.js";

export const DiagramFileField = {
  name: "DiagramFileField",
  components: { DiagramUploadControl, DiagramMedia },
  emits: ["update:modelValue"],
  props: {
    field: { type: Object, required: true }, modelValue: { default: null },
    documentModel: { type: Object, default: () => ({}) }
  },
  data() { return { showPreview: false }; },
  computed: {
    files() {
      const records = valueAtPath(this.documentModel, this.field.collectionPath || []);
      return (Array.isArray(records) ? records : []).map((record) => record?.[this.field.artifactField || "file"]).filter(Boolean);
    },
    downloadable() { return this.modelValue && !diagramPayloadError(this.modelValue); }
  },
  methods: {
    download() {
      if (!this.downloadable) return;
      const file = this.modelValue;
      const drawio = file.artifactKind === "DrawIO source";
      const href = drawio ? URL.createObjectURL(new Blob([file.content], { type: "application/xml" })) : file.content;
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = file.sourceFileName || (drawio ? "diagram.drawio" : "diagram.png");
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
};
