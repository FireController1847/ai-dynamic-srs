import { DIAGRAM_FILE_ACCEPT, MAX_DIAGRAM_COLLECTION_BYTES, readDiagramArtifact } from "../../core/artifacts/diagram-files.js";

export const DiagramUploadControl = {
  name: "DiagramUploadControl",
  emits: ["uploaded"],
  props: {
    files: { type: Array, default: () => [] },
    replacing: { type: Object, default: null },
    multiple: { type: Boolean, default: false },
    label: { type: String, default: "Upload diagram" }
  },
  data() { return { accept: DIAGRAM_FILE_ACCEPT, busy: false, errors: [], disposed: false }; },
  beforeUnmount() { this.disposed = true; },
  methods: {
    async upload(event) {
      const selected = [...(event.target.files || [])];
      event.target.value = "";
      this.errors = [];
      this.busy = true;
      const accepted = [];
      try {
        for (const file of selected) {
          try {
            const payload = await readDiagramArtifact(file);
            const currentBytes = this.files.filter((entry) => entry && entry !== this.replacing)
              .reduce((sum, entry) => sum + (Number(entry.sizeBytes) || 0), 0);
            const pendingBytes = accepted.reduce((sum, entry) => sum + entry.sizeBytes, 0);
            if (currentBytes + pendingBytes + payload.sizeBytes > MAX_DIAGRAM_COLLECTION_BYTES) {
              throw new Error("The shared diagram register has a 3 MB total file limit, including retired figures.");
            }
            accepted.push(payload);
          } catch (error) { this.errors.push(`${file.name}: ${error.message}`); }
        }
        if (!this.disposed && accepted.length) this.$emit("uploaded", accepted);
      } finally { this.busy = false; }
    }
  },
  template: `
    <div class="diagram-upload-control">
      <label class="btn btn-outline-primary btn-sm" :class="{ disabled: busy }">
        {{ busy ? 'Reading diagrams…' : label }}
        <input class="visually-hidden" type="file" :aria-label="label" :accept="accept" :multiple="multiple" :disabled="busy" @change="upload">
      </label>
      <small class="d-block text-body-secondary mt-1">DrawIO/XML, PNG, JPEG · 2 MB/file · 3 MB shared total</small>
      <ul v-if="errors.length" class="small text-danger mt-2" role="alert"><li v-for="error in errors" :key="error">{{ error }}</li></ul>
    </div>
  `
};
