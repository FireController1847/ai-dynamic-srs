import { computed, createApp, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { DOCUMENTS, findDocument, type DocumentId } from '../features/documents/catalog.ts';
import { DocumentView } from '../features/documents/document-view.ts';
import { ClientRequirements } from '../features/client-requirements/client-requirements.ts';
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
    const narrow = window.matchMedia('(max-width: 760px)');
    const sidebarOpen = ref(!narrow.matches);
    const selectedId = ref<DocumentId>(documentIdFromLocation());
    const selectedDocument = computed(() => findDocument(selectedId.value) ?? DOCUMENTS[0]);
    const sidebarToggle = ref<HTMLButtonElement | null>(null);
    const pageHeading = ref<HTMLElement | null>(null);

    function focusHeading() {
      void nextTick(() => pageHeading.value?.focus());
    }

    function closeSidebar(restoreFocus = false) {
      sidebarOpen.value = false;
      if (restoreFocus) void nextTick(() => sidebarToggle.value?.focus());
    }

    function toggleSidebar() {
      sidebarOpen.value = !sidebarOpen.value;
      if (sidebarOpen.value && narrow.matches) {
        void nextTick(() => {
          const current = document.querySelector<HTMLAnchorElement>(
            '.document-navigation-link[aria-current="page"]');
          current?.focus();
        });
      }
    }

    function selectDocument(id: DocumentId) {
      if (selectedId.value !== id) {
        selectedId.value = id;
        window.history.pushState(null, '', '#/documents/' + id);
      }
      if (narrow.matches) closeSidebar();
      focusHeading();
    }

    function syncLocation() {
      selectedId.value = documentIdFromLocation();
      if (narrow.matches) closeSidebar();
      focusHeading();
    }

    function onViewportChange(event: MediaQueryListEvent) {
      sidebarOpen.value = !event.matches;
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && sidebarOpen.value && narrow.matches &&
          !document.querySelector('dialog[open]')) closeSidebar(true);
    }

    onMounted(() => {
      narrow.addEventListener('change', onViewportChange);
      window.addEventListener('hashchange', syncLocation);
      window.addEventListener('popstate', syncLocation);
      window.addEventListener('keydown', onEscape);
    });
    onBeforeUnmount(() => {
      narrow.removeEventListener('change', onViewportChange);
      window.removeEventListener('hashchange', syncLocation);
      window.removeEventListener('popstate', syncLocation);
      window.removeEventListener('keydown', onEscape);
    });

    return () => h('div', { class: 'app-shell' }, [
      h('header', { class: 'app-header' }, [
        h('button', {
          ref: sidebarToggle, type: 'button',
          class: 'icon-button sidebar-toggle',
          title: sidebarOpen.value ? 'Hide documents' : 'Show documents',
          'aria-label': sidebarOpen.value ? 'Hide documents sidebar' : 'Show documents sidebar',
          'aria-controls': 'documents-sidebar',
          'aria-expanded': sidebarOpen.value,
          onClick: toggleSidebar,
        }, [
          h('svg', {
            viewBox: '0 0 24 24', width: 20, height: 20,
            fill: 'none', stroke: 'currentColor', 'stroke-width': 1.7,
            'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            'aria-hidden': 'true', focusable: 'false',
          }, [
            h('rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }),
            h('path', { d: 'M9 4v16' }),
          ]),
        ]),
        h('span', { class: 'app-brand-mark', 'aria-hidden': 'true' }, 'S'),
        h('h1', 'Dynamic SRS'),
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
      h(ThemeMenu, { ref: themeMenu }),
      h('div', {
        class: ['app-layout', sidebarOpen.value ? 'sidebar-open' : 'sidebar-collapsed'],
      }, [
        h('button', {
          type: 'button', class: 'sidebar-scrim', tabindex: -1,
          'aria-label': 'Close documents sidebar',
          onClick: () => closeSidebar(true),
        }),
        h(DocumentSidebar, {
          selected: selectedId.value,
          workspace,
          inert: !sidebarOpen.value,
          'aria-hidden': !sidebarOpen.value ? 'true' : undefined,
          onSelect: selectDocument,
        }),
        h('main', {
          class: 'app-content', id: 'document-content',
          inert: narrow.matches && sidebarOpen.value,
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
                  default: () => h(ClientRequirements, { workspace }),
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
