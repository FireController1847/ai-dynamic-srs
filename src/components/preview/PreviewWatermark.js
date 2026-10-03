export const PreviewWatermark = {
  props: {
    isPartial: { type: Boolean, default: false },
    isPrinting: { type: Boolean, default: false }
  },
  computed: {
    label() {
      return this.isPrinting && this.isPartial ? "PARTIAL" : "PREVIEW";
    },
    visible() {
      return !this.isPrinting || this.isPartial;
    }
  },
  template: `
    <div v-if="visible" class="document-watermark" aria-hidden="true">{{ label }}</div>
  `
};
