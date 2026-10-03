import { diagramPayloadError } from "../../core/artifacts/diagram-files.js";
import { DrawioDiagramPreview } from "./DrawioDiagramPreview.js";

export const DiagramMedia = {
  name: "DiagramMedia",
  components: { DrawioDiagramPreview },
  props: { file: { default: null }, title: { type: String, default: "Diagram" } },
  data() { return { revision: 0, imageError: false }; },
  computed: { payloadError() { return this.file ? diagramPayloadError(this.file) : ""; } },
  watch: { file() { this.revision += 1; this.imageError = false; } },
  template: `
    <div class="document-diagram">
      <p v-if="!file" class="document-empty">No diagram file uploaded.</p>
      <p v-else-if="payloadError || imageError" class="diagram-preview-error" data-diagram-state="error" role="alert">{{ payloadError || 'The image could not be decoded.' }}</p>
      <drawio-diagram-preview v-else-if="file.artifactKind === 'DrawIO source'" :key="revision" :xml="file.content" :title="title"></drawio-diagram-preview>
      <img v-else class="diagram-image-preview" :src="file.content" :alt="title" @error="imageError = true">
    </div>
  `
};
