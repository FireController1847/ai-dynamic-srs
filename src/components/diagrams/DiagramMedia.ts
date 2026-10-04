import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { diagramPayloadError } from "../../core/artifacts/diagram-files.ts";
import { DrawioDiagramPreview } from "./DrawioDiagramPreview.ts";

export const DiagramMedia = defineComponent({
  name: "DiagramMedia",
  components: { DrawioDiagramPreview },
  props: { file: { type: null as unknown as PropType<DataModel | null>, default: null }, title: { type: String, default: "Diagram" } },
  data() { return { revision: 0, imageError: false }; },
  computed: { payloadError(): string { return this.file ? diagramPayloadError(this.file) : ""; } },
  watch: { file() { this.revision += 1; this.imageError = false; } },
  template: `
    <div class="document-diagram">
      <p v-if="!file" class="document-empty">No diagram file uploaded.</p>
      <p v-else-if="payloadError || imageError" class="diagram-preview-error" data-diagram-state="error" role="alert">{{ payloadError || 'The image could not be decoded.' }}</p>
      <drawio-diagram-preview v-else-if="file.artifactKind === 'DrawIO source'" :key="revision" :xml="file.content" :title="title"></drawio-diagram-preview>
      <img v-else class="diagram-image-preview" :src="file.content" :alt="title" @error="imageError = true">
    </div>
  `
});
