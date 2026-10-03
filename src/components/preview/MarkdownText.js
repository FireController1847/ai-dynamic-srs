import { renderMarkdown } from '../../core/formatting/markdown.js';
export const MarkdownText = {
  props: { value: { default: '' } },
  computed: { html() { return renderMarkdown(this.value); } },
  // Only the escaped, allowlisted output of our renderer enters v-html.
  template: '<div class="document-markdown" v-html="html"></div>'
};
