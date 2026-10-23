import { defineComponent, h, type PropType } from 'vue';
import { DOCUMENTS, type DocumentId } from '../features/documents/catalog.ts';
import { WorkspaceFiles } from './workspace-files.ts';
import type { WorkspaceController } from './workspace.ts';

export const DocumentSidebar = defineComponent({
  name: 'DocumentSidebar',
  props: {
    selected: { type: String as PropType<DocumentId>, required: true },
    workspace: { type: Object as PropType<WorkspaceController>, required: true },
  },
  emits: {
    select: (_id: DocumentId) => true,
  },
  setup(props, { emit }) {
    return () => h('aside', { class: 'app-sidebar', id: 'documents-sidebar' }, [
      h('div', { class: 'sidebar-navigation' }, [
        h('h2', { class: 'sidebar-heading', id: 'documents-heading' }, 'Documents'),
        h('nav', { 'aria-labelledby': 'documents-heading' }, [
          h('ul', { class: 'document-navigation' },
            DOCUMENTS.map(document => h('li', { key: document.id }, [
              h('a', {
                class: 'document-navigation-link',
                href: '#/documents/' + document.id,
                'aria-current': props.selected === document.id ? 'page' : undefined,
                onClick: (event: MouseEvent) => {
                  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                  event.preventDefault();
                  emit('select', document.id);
                },
              }, [
                h('span', { class: 'document-navigation-abbreviation', 'aria-hidden': 'true' }, document.abbreviation),
                h('span', { class: 'document-navigation-name' }, document.title),
              ]),
            ]))),
        ]),
      ]),
      h('div', { class: 'sidebar-footer' }, [
        h(WorkspaceFiles, { workspace: props.workspace }),
      ]),
    ]);
  },
});
