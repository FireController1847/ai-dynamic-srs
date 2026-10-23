import { createApp, defineComponent, h, ref } from 'vue';
import { initializeTheme } from './theme.ts';
import { ThemeMenu, type ThemeMenuHandle } from './theme-menu.ts';
import '../styles/index.css';

initializeTheme();

const App = defineComponent({
  name: 'App',
  setup() {
    const themeMenu = ref<ThemeMenuHandle | null>(null);

    return () => h('div', { class: 'app-shell' }, [
      h('header', { class: 'app-header' }, [
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
      h('div', { class: 'app-layout' }, [
        h('main', { class: 'app-content' }, [
          h('div', { class: 'home-page' }, [
            h('h2', 'Workspace'),
            h('p', { class: 'home-intro' }, 'A new foundation for Dynamic SRS.'),
            h('section', { class: 'blank-state', 'aria-label': 'Empty workspace' }, [
              h('div', { class: 'blank-state-mark', 'aria-hidden': 'true' }, '✦'),
              h('h3', 'A blank slate'),
              h('p', 'No workflows or documents have been defined yet.'),
            ]),
          ]),
        ]),
      ]),
      h('span', { class: 'app-version' }, 'v0.1.0'),
    ]);
  },
});

createApp(App).mount('#app');
