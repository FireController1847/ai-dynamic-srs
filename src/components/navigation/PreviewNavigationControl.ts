import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
import { preferredScrollBehavior } from "../../core/browser/motion.ts";

const controlState = new WeakMap();

export const PreviewNavigationControl = defineComponent({
  props: {
    formId: { type: String, required: true },
    targetId: { type: String, required: true }
  },
  data() {
    return {
      isViewingPreview: false
    };
  },
  mounted() {
    const state = {
      frameId: 0,
      panelObserver: null
    };
    controlState.set(this, state);

    window.addEventListener("scroll", this.schedulePositionUpdate, { passive: true });
    window.addEventListener("resize", this.schedulePositionUpdate, { passive: true });

    const pagePanel = this.$el.closest(".page-panel");
    if (pagePanel) {
      state.panelObserver = new MutationObserver(() => this.schedulePositionUpdate());
      state.panelObserver.observe(pagePanel, {
        attributes: true,
        attributeFilter: ["hidden", "style"]
      });
    }

    this.$nextTick(() => this.schedulePositionUpdate());
  },
  beforeUnmount() {
    window.removeEventListener("scroll", this.schedulePositionUpdate);
    window.removeEventListener("resize", this.schedulePositionUpdate);

    const state = controlState.get(this);
    if (state) {
      window.cancelAnimationFrame(state.frameId);
      state.panelObserver?.disconnect();
      controlState.delete(this);
    }
  },
  methods: {
    scrollToDestination() {
      if (this.isViewingPreview) {
        this.scrollTo(this.formId);
        return;
      }

      this.scrollToPreview();
    },
    scrollToPreview() {
      this.scrollTo(this.targetId);
    },
    scrollTo(targetId: string) {
      const target = document.getElementById(targetId);
      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: preferredScrollBehavior(),
        block: "start"
      });
    },
    schedulePositionUpdate() {
      const state = controlState.get(this);
      if (!state) {
        return;
      }

      window.cancelAnimationFrame(state.frameId);
      state.frameId = window.requestAnimationFrame(() => {
        state.frameId = window.requestAnimationFrame(() => this.updatePosition());
      });
    },
    updatePosition() {
      const preview = document.getElementById(this.targetId);
      if (!preview || preview.getClientRects().length === 0) {
        this.isViewingPreview = false;
        return;
      }

      this.isViewingPreview = preview.getBoundingClientRect().top <= window.innerHeight * 0.35;
    }
  },
  template: `
    <div class="preview-navigation-control">
      <slot></slot>
      <button class="btn btn-sm workspace-utility-button preview-jump-button" type="button" @click="scrollToDestination">
        <span>{{ isViewingPreview ? "Back to form" : "View document preview" }}</span>
        <svg :class="{ 'is-returning': isViewingPreview }" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M8 2.25v10.5M3.75 8.75 8 13l4.25-4.25"></path>
        </svg>
      </button>
    </div>
  `
});
