import { defineComponent, h, type PropType } from 'vue';
import type { DocumentDefinition } from './catalog.ts';

/** Each document owns its view; content tools will be introduced as requirements are defined. */
export const DocumentView = defineComponent({
  name: 'DocumentView',
  props: {
    document: { type: Object as PropType<DocumentDefinition>, required: true },
  },
  setup(props) {
    return () => h('section', { class: 'document-page', 'aria-label': props.document.title }, [
      h('header', { class: 'document-page-header' }, [
        h('p', { class: 'document-eyebrow' }, 'Document · ' + props.document.abbreviation),
        h('h2', { class: 'document-page-title' }, props.document.title),
        h('p', { class: 'document-page-description' }, props.document.description),
      ]),
      h('section', { class: 'document-empty', 'aria-label': 'Empty document' }, [
        h('svg', {
          class: 'document-empty-icon',
          viewBox: '0 0 48 48', width: 48, height: 48,
          fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          'aria-hidden': 'true', focusable: 'false',
        }, [
          h('path', { d: 'M11 5h18l8 8v28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' }),
          h('path', { d: 'M29 5v10h8M16 24h14M16 31h14' }),
        ]),
        h('h3', 'Nothing here yet'),
        h('p', 'This document has its own workspace. Content and editing tools have not been added yet.'),
      ]),
    ]);
  },
});
