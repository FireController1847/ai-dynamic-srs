import { defineComponent, h, Transition, type PropType } from 'vue';
import { DOCUMENTS, type DocumentId } from '../features/documents/catalog.ts';
import { WorkspaceFiles } from './workspace-files.ts';
import type { WorkspaceController } from './workspace.ts';

/** Full-height, modal document navigation with one shared set of workspace tools. */
export const DocumentSidebar = defineComponent({
  name: 'DocumentSidebar',
  props: {
    open: { type: Boolean, required: true },
    selected: { type: String as PropType<DocumentId>, required: true },
    workspace: { type: Object as PropType<WorkspaceController>, required: true },
  },
  emits: {
    close: () => true,
    closed: () => true,
    select: (_id: DocumentId) => true,
  },
  setup(props, { emit }) {
    return () => h(Transition, {
      name: 'drawer',
      onEnter: (element: Element) => {
        if (element instanceof HTMLDialogElement) element.showModal();
      },
      onAfterLeave: () => emit('closed'),
    }, {
      default: () => props.open ? h('dialog', {
        id: 'documents-sidebar',
        class: 'navigation-drawer',
        'aria-label': 'Document navigation',
        onCancel: (event: Event) => {
          event.preventDefault();
          emit('close');
        },
        onClick: (event: MouseEvent) => {
          if (event.target === event.currentTarget) emit('close');
        },
      }, [
        h('aside', { class: 'drawer-panel' }, [
          h('div', { class: 'drawer-header' }, [
            h('div', { class: 'drawer-brand' }, [
              h('span', { class: 'app-brand-mark drawer-brand-mark', 'aria-hidden': 'true' }, 'S'),
              h('span', { class: 'drawer-title' }, 'Dynamic SRS'),
            ]),
            h('button', {
              type: 'button',
              class: 'menu-toggle menu-toggle--close',
              'aria-label': 'Close document navigation',
              autofocus: true,
              onClick: () => emit('close'),
            }, [
              h('span', { class: 'menu-icon menu-icon--close', 'aria-hidden': 'true' }, [
                h('span'), h('span'), h('span'),
              ]),
            ]),
          ]),
          h('nav', { class: 'sidebar-navigation', 'aria-labelledby': 'documents-heading' }, [
            h('h2', { class: 'sidebar-heading', id: 'documents-heading' }, 'Documents'),
            h('ul', { class: 'document-navigation' },
              DOCUMENTS.map(document => h('li', { key: document.id }, [
                h('a', {
                  class: 'document-navigation-link',
                  href: '#/documents/' + document.id,
                  'aria-current': props.selected === document.id ? 'page' : undefined,
                  onClick: (event: MouseEvent) => {
                    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
                        event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    emit('select', document.id);
                  },
                }, [
                  h('span', {
                    class: 'document-navigation-abbreviation', 'aria-hidden': 'true',
                  }, document.abbreviation),
                  h('span', { class: 'document-navigation-name' }, document.title),
                ]),
              ]))),
          ]),
          h('div', { class: 'sidebar-footer' }, [
            h(WorkspaceFiles, { workspace: props.workspace }),
          ]),
        ]),
      ]) : null,
    });
  },
});
