import type { ParentConfig, OutlineSection, EvidenceView, Repeater } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import type { Field, Section, SchemaNode, DataModel, DocumentModel, ParentChoice, DocumentConfig, SectionContext, MetadataEntry, Help, RecordReview, Evidence } from '../../core/schema/schema-types.ts';
export const CopyPromptControl = defineComponent({
  emits: ["copy"],
  props: {
    buttonClass: { type: String, default: "" },
    copied: { type: Boolean, default: false },
    label: { type: String, required: true },
    tooltip: { type: String, required: true }
  },
  template: `
    <span class="section-copy-control">
      <button
        v-bs-tooltip="copied ? 'Copied' : tooltip"
        class="section-copy-trigger"
        :class="[buttonClass, { copied }]"
        type="button"
        :aria-label="copied ? 'Copied ' + label : label"
        @click="$emit('copy')"
      >
        <svg v-if="!copied" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="8" y="8" width="11" height="11" rx="2"></rect>
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path>
        </svg>
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="m5 12 4 4L19 6"></path>
        </svg>
      </button>
    </span>
  `
});

export const SectionInfo = defineComponent({
  components: { CopyPromptControl },
  emits: ["copy-markdown"],
  props: {
    copied: { type: Boolean, default: false },
    copyKey: { type: String, required: true },
    copyText: { type: String, required: true },
    help: { type: [String, Object] as PropType<string | Help>, default: "" },
    title: { type: String, required: true }
  },
  computed: {
    helpContent(): string {
      if (typeof this.help === "string") return this.help.trim();
      // Older descriptors remain readable without imposing a question format.
      return [this.help?.text, this.help?.what, this.help?.why, this.help?.expectation]
        .filter((text) => typeof text === "string" && text.trim()).join("\n\n");
    },
    popoverOptions(): { title: string; content: string; html: boolean; customClass: string } {
      return { title: this.title, content: this.helpContent, html: false, customClass: "section-help-popover" };
    }
  },
  template: `
    <span class="section-help">
      <copy-prompt-control
        :copied="copied"
        :label="'Copy ' + title + ' AI prompt as Markdown'"
        tooltip="Copies an AI-ready Markdown prompt for this section. Paste it into a chat to help draft the fields."
        @copy="$emit('copy-markdown', { markdown: copyText, title, key: copyKey })"
      ></copy-prompt-control>
      <span v-if="helpContent" class="section-info-tip">
        <button
          v-bs-popover="popoverOptions"
          class="section-help-trigger"
          type="button"
          :aria-label="'About the ' + title + ' section'"
          @keydown.esc="$event.currentTarget.blur()"
        >?</button>
      </span>
    </span>
  `
});
