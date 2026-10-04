import { defineComponent } from 'vue';

export const WorkspaceDownloadControl = defineComponent({
  emits: ['download-wip', 'download-md'],
  data() {
    return { open: false };
  },
  mounted() {
    document.addEventListener('pointerdown', this.closeOutside);
  },
  beforeUnmount() {
    document.removeEventListener('pointerdown', this.closeOutside);
  },
  methods: {
    closeOutside(event: PointerEvent) {
      const root = this.$refs.root;
      if (root instanceof HTMLElement && event.target instanceof Node && !root.contains(event.target)) this.open = false;
    },
    closeOnBlur(event: FocusEvent) {
      const root = this.$refs.root;
      if (root instanceof HTMLElement && (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget))) this.open = false;
    },
    escape() {
      if (!this.open) return;
      this.open = false;
      const toggle = this.$refs.toggle;
      if (toggle instanceof HTMLElement) toggle.focus();
    },
    openOptions() {
      this.open = true;
      this.$nextTick(() => {
        const option = this.$refs.option;
        if (option instanceof HTMLElement) option.focus();
      });
    },
    downloadWip() {
      this.open = false;
      this.$emit('download-wip');
    },
    downloadMd() {
      this.escape();
      this.$emit('download-md');
    }
  },
  template: `
    <div ref="root" class="workspace-download" @focusout="closeOnBlur" @keydown.esc.stop.prevent="escape">
      <button class="btn btn-primary app-header-action workspace-download-main" type="button" @click="downloadWip">Download WIP</button>
      <button ref="toggle" class="btn btn-light workspace-download-toggle" type="button"
        aria-label="More download options" aria-controls="workspace-download-options" :aria-expanded="open"
        @click="open = !open" @keydown.down.prevent="openOptions">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
      </button>
      <div v-if="open" id="workspace-download-options" class="workspace-download-options" aria-label="Download options">
        <button ref="option" class="workspace-download-option" type="button" @click="downloadMd">Download MD</button>
      </div>
    </div>
  `
});
