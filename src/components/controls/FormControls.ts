import type { CopyRequest, Help } from '../../core/schema/schema-types.ts';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';

export type FieldPromptFactory = (path: readonly (string | number)[]) => CopyRequest;
export const CopyPromptControl = defineComponent({
  emits: ["copy"],
  props: {
    buttonClass: { type: String, default: "" },
    copied: { type: Boolean, default: false },
    persistent: { type: Boolean, default: false },
    label: { type: String, required: true },
    tooltip: { type: String, required: true }
  },
  template: `
    <span class="section-copy-control" :class="{ 'is-persistent': persistent }">
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
    title: { type: String, required: true },
    diagram: { type: Boolean, default: false }
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
        persistent
        :copied="copied"
        :label="'Copy ' + title + (diagram ? ' AI diagram prompt' : ' formatted-answer prompt')"
        :tooltip="diagram ? 'Generates diagram semantics from selected evidence. Repeatable figure sections return an ordered dsrs-diagrams batch for Import AI diagrams; individual figures use dsrs-diagram.' : 'Copies the complete form structure for this section or collection. The AI returns ready-to-enter answers using known information; use the tab interview to gather missing details.'"
        @copy="$emit('copy-markdown', { markdown: copyText, title, key: copyKey })"
      ></copy-prompt-control>
      <span v-if="helpContent" class="section-info-tip">
        <button
          v-bs-popover="popoverOptions"
          class="section-help-trigger"
          type="button"
          :aria-label="'About the ' + title + ' section'"
          @keydown.esc="$event.currentTarget.blur()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M9.8 9.25a2.45 2.45 0 0 1 4.7.95c0 1.75-2.5 2.05-2.5 4"></path>
            <path d="M12 17.25h.01"></path>
          </svg>
        </button>
      </span>
    </span>
  `
});
