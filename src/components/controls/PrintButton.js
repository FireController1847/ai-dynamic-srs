export const PrintDocumentButton = {
  emits: ["print"],
  props: {
    isPrinting: { type: Boolean, default: false }
  },
  template: `
    <button
      class="btn btn-dark print-document-button"
      type="button"
      :disabled="isPrinting"
      :aria-busy="isPrinting ? 'true' : 'false'"
      @click="$emit('print')"
    >
      <span v-if="isPrinting" class="spinner-border spinner-border-sm" aria-hidden="true"></span>
      <span>{{ isPrinting ? "Preparing print…" : "Print document" }}</span>
    </button>
  `
};
