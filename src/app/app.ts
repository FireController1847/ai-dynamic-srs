import { computed, createApp, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { DOCUMENTS, findDocument, type DocumentId } from '../features/documents/catalog.ts';
import { DocumentView } from '../features/documents/document-view.ts';
import { ClientRequirements, type ClientRequirementsHandle } from '../features/client-requirements/client-requirements.ts';
import { SystemRequestEditor, type SystemRequestHandle } from '../features/system-request/system-request.ts';
import { DocumentSidebar } from './document-sidebar.ts';
import { initializeTheme } from './theme.ts';
import { ThemeMenu, type ThemeMenuHandle } from './theme-menu.ts';
import { useWorkspace } from './workspace.ts';
import '../styles/index.css';

initializeTheme();

function documentIdFromLocation(): DocumentId {
  const match = /^#\/documents\/([a-z]+)$/.exec(window.location.hash);
  return findDocument(match?.[1] ?? '')?.id ?? DOCUMENTS[0].id;
}

const App = defineComponent({
  name: 'App',
  setup() {
    const themeMenu = ref<ThemeMenuHandle | null>(null);
    const workspace = useWorkspace();
    const sidebarOpen = ref(false);
    const selectedId = ref<DocumentId>(documentIdFromLocation());
    const crDirty = ref(false);
    const srDirty = ref(false);
    const crEditor = ref<ClientRequirementsHandle | null>(null);
    const srEditor = ref<SystemRequestHandle | null>(null);
    const selectedDocument = computed(() => findDocument(selectedId.value) ?? DOCUMENTS[0]);
    const menuButton = ref<HTMLButtonElement | null>(null);
    const main = ref<HTMLElement | null>(null);
    const pageHeading = ref<HTMLElement | null>(null);
    let focusDocumentOnClose = false;

    function focusDocument() {
      void nextTick(() => {
        if (main.value) main.value.scrollTop = 0;
        pageHeading.value?.focus();
      });
    }

    function openSidebar() {
      focusDocumentOnClose = false;
      sidebarOpen.value = true;
    }

    function closeSidebar() {
      focusDocumentOnClose = false;
      sidebarOpen.value = false;
    }

    function afterSidebarClosed() {
      void nextTick(() => {
        if (focusDocumentOnClose) focusDocument();
        else menuButton.value?.focus();
        focusDocumentOnClose = false;
      });
    }

    async function canLeaveDocument(nextId: DocumentId): Promise<boolean> {
      if (nextId === selectedId.value) return true;
      // Flush the currently selected document before switching or changing the URL.
      const current = selectedId.value;
      const dirty = current === 'cr' ? crDirty.value : current === 'sr' ? srDirty.value : false;
      if (!dirty) return true;
      const saved = current === 'cr'
        ? await crEditor.value?.flushSave()
        : await srEditor.value?.flushSave();
      if (saved) return true;
      return window.confirm('The latest ' + (current === 'cr' ? 'Client Requirements' : 'System Request') +
        ' changes could not be saved. Leave and discard them?');
    }

    async function selectDocument(id: DocumentId) {
      const previous = selectedId.value;
      if (!await canLeaveDocument(id) || selectedId.value !== previous) return;
      if (selectedId.value !== id) {
        selectedId.value = id;
        window.history.pushState(null, '', '#/documents/' + id);
      }
      focusDocumentOnClose = true;
      if (sidebarOpen.value) sidebarOpen.value = false;
      else focusDocument();
    }

    async function syncLocation() {
      const previous = selectedId.value;
      const nextId = documentIdFromLocation();
      if (!await canLeaveDocument(nextId)) {
        window.history.replaceState(null, '', '#/documents/' + previous);
        return;
      }
      if (selectedId.value !== previous) return;
      selectedId.value = nextId;
      focusDocumentOnClose = true;
      if (sidebarOpen.value) sidebarOpen.value = false;
      else focusDocument();
    }

    onMounted(() => {
      window.addEventListener('hashchange', syncLocation);
      window.addEventListener('popstate', syncLocation);
      // Start on the document header, not a retained midway scroll position.
      void nextTick(() => {
        if (main.value) main.value.scrollTop = 0;
      });
    });
    onBeforeUnmount(() => {
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
    });

    return () => h('div', { class: 'app-shell' }, [
      h('header', { class: 'app-header' }, [
        h('button', {
          ref: menuButton,
          type: 'button',
          class: 'menu-toggle',
          'aria-label': 'Open document navigation',
          'aria-controls': 'documents-sidebar',
          'aria-expanded': sidebarOpen.value,
          onClick: openSidebar,
        }, [
          h('svg', {
            class: 'menu-icon',
            width: 20, height: 20, viewBox: '0 0 24 24',
            stroke: 'currentColor', 'stroke-width': 2.4,
            'stroke-linecap': 'round', fill: 'none',
            'aria-hidden': 'true', focusable: 'false',
          }, [
            h('path', { d: 'M4 6h16' }),
            h('path', { d: 'M4 12h16' }),
            h('path', { d: 'M4 18h16' }),
          ]),
        ]),
        h('span', { class: 'app-brand-mark app-header-mark', 'aria-hidden': 'true' }, 'S'),
        h('h1', selectedDocument.value.title),
        h('div', { class: 'app-header-actions' }, [
          h('button', {
            type: 'button',
            class: 'quiet-button app-header-action',
            title: 'Theme settings',
            'aria-label': 'Open theme settings',
            'aria-haspopup': 'dialog',
            onClick: (event: MouseEvent) => themeMenu.value?.open(event.currentTarget),
          }, [
            h('svg', {
              class: 'ui-icon', viewBox: '0 0 24 24', width: 20, height: 20,
              fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6,
              'stroke-linecap': 'round', 'stroke-linejoin': 'round',
              'aria-hidden': 'true', focusable: 'false',
            }, [
              h('circle', { cx: 12, cy: 12, r: 9 }),
              h('path', { d: 'M12 3a9 9 0 0 1 0 18Z', fill: 'currentColor', stroke: 'none', 'fill-opacity': 0.22 }),
              h('path', { d: 'M12 3v18' }),
            ]),
            h('span', { class: 'app-header-action-label' }, 'Theme'),
          ]),
        ]),
      ]),
      h(DocumentSidebar, {
        open: sidebarOpen.value,
        selected: selectedId.value,
        workspace,
        onClose: closeSidebar,
        onClosed: afterSidebarClosed,
        onSelect: selectDocument,
      }),
      h(ThemeMenu, { ref: themeMenu }),
      h('div', { class: 'app-layout' }, [
        h('main', {
          ref: main,
          class: 'app-content',
          id: 'document-content',
          tabindex: -1,
        }, [
          h('div', { class: 'document-page-container' }, [
            !workspace.ready.value || workspace.problem.value
              ? h('p', {
                  class: 'workspace-storage-warning',
                  role: workspace.problem.value ? 'alert' : 'status',
                }, workspace.problem.value || 'Opening locally saved workspace…')
              : null,
            h('div', { ref: pageHeading, tabindex: -1, class: 'document-heading-focus' }, [
              selectedId.value === 'cr'
                ? h(DocumentView, { document: selectedDocument.value }, {
                  default: () => h(ClientRequirements, {
                    ref: crEditor,
                    workspace,
                    onDirtyChange: (value: boolean) => { crDirty.value = value; },
                  }),
                })
                : selectedId.value === 'sr'
                  ? h(DocumentView, { document: selectedDocument.value }, {
                    default: () => h(SystemRequestEditor, {
                      ref: srEditor,
                      workspace,
                      onDirtyChange: (value: boolean) => { srDirty.value = value; },
                    }),
                  })
                  : h(DocumentView, { document: selectedDocument.value }),
            ]),
          ]),
        ]),
      ]),
      h('span', { class: 'app-version' }, 'v0.1.0'),
    ]);
  },
});

createApp(App).mount('#app');
