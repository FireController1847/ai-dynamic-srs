import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
const DRAWIO_VIEWER_URL = "https://viewer.diagrams.net/js/viewer-static.min.js";
const DRAWIO_VIEWER_SCRIPT_ID = "drawio-static-viewer";

let viewerPromise = null;

function loadDrawioViewer() {
  if (window.GraphViewer) {
    return Promise.resolve(window.GraphViewer);
  }

  if (viewerPromise) {
    return viewerPromise;
  }

  let timeout;
  viewerPromise = new Promise((resolve, reject) => {
    timeout = window.setTimeout(() => reject(new Error("The diagrams.net viewer timed out. Check your connection and reopen the preview.")), 15000);
    const existingScript = document.getElementById(DRAWIO_VIEWER_SCRIPT_ID);
    const previousCallback = window.onDrawioViewerLoad;

    const finish = () => {
      if (window.GraphViewer) {
        resolve(window.GraphViewer);
      } else {
        reject(new Error("The official diagrams.net viewer loaded without its rendering API."));
      }
    };

    window.onDrawioViewerLoad = () => {
      if (typeof previousCallback === "function") {
        previousCallback();
      }
      finish();
    };

    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("The diagrams.net viewer could not be loaded.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = DRAWIO_VIEWER_SCRIPT_ID;
    script.src = DRAWIO_VIEWER_URL;
    script.async = true;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", () => reject(new Error("The diagrams.net viewer could not be loaded.")), { once: true });
    document.head.append(script);
  }).catch((error) => {
    viewerPromise = null;
    document.getElementById(DRAWIO_VIEWER_SCRIPT_ID)?.remove();
    throw error;
  }).finally(() => window.clearTimeout(timeout));

  return viewerPromise;
}

export const DrawioDiagramPreview = defineComponent({
  name: "DrawioDiagramPreview",
  props: {
    xml: { type: String, required: true },
    title: { type: String, default: "DrawIO diagram" }
  },
  data() {
    return {
      errorMessage: "",
      isLoading: true
    };
  },
  computed: {
    viewerConfiguration(): string {
      return JSON.stringify({
        highlight: "#0d6efd",
        nav: true,
        resize: true,
        toolbar: "zoom layers lightbox",
        xml: this.xml
      });
    }
  },
  mounted() {
    this.renderDiagram();
  },
  methods: {
    async renderDiagram() {
      this.errorMessage = "";
      this.isLoading = true;

      try {
        const GraphViewer = await loadDrawioViewer();
        await this.$nextTick();

        if (!this.$refs.viewer) {
          return;
        }

        GraphViewer.processElements();
        const renderDeadline = Date.now() + 3000;
        while (this.$refs.viewer && !this.$refs.viewer.querySelector("svg") && Date.now() < renderDeadline) {
          await new Promise((resolve) => window.setTimeout(resolve, 50));
        }
        if (this.$refs.viewer && !this.$refs.viewer.querySelector("svg")) {
          throw new Error("No drawable content was found. Check the selected diagram page or upload a PNG/JPEG export.");
        }
      } catch (error) {
        this.errorMessage = error.message;
      } finally {
        this.isLoading = false;
      }
    }
  },
  template: `
    <div class="drawio-preview-frame" :aria-label="title" :data-diagram-state="isLoading ? 'loading' : errorMessage ? 'error' : 'ready'">
      <p v-if="isLoading" class="diagram-preview-status mb-0" role="status">Loading DrawIO preview…</p>
      <div
        v-show="!errorMessage"
        ref="viewer"
        class="mxgraph drawio-viewer-canvas"
        :data-mxgraph="viewerConfiguration"
      ></div>
      <div v-if="errorMessage" class="diagram-preview-error" role="alert">
        <strong>Preview unavailable.</strong>
        <span>{{ errorMessage }}</span>
        <small>The original DrawIO source remains saved in this workspace.</small>
      </div>
    </div>
  `
});
