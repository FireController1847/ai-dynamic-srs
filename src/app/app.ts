import { createApp, defineComponent, h, ref } from 'vue';
import '../styles/index.css';

type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

const App = defineComponent({
  name: 'App',
  setup() {
    const theme = ref<Theme>(currentTheme());

    function toggleTheme(): void {
      theme.value = theme.value === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme.value;
      try {
        localStorage.setItem('dynamic-srs.theme', theme.value);
      } catch { /* The theme still works when storage is unavailable. */ }
    }

    return () => h('div', { class: 'app-shell' }, [
      h('header', { class: 'app-header' }, [
        h('span', { class: 'app-brand-mark', 'aria-hidden': 'true' }, 'S'),
        h('h1', 'Dynamic SRS'),
        h('div', { class: 'app-header-actions' }, [
          h('button', {
            type: 'button',
            class: 'quiet-button app-header-action',
            'aria-label': theme.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
            onClick: toggleTheme,
          }, [
            h('span', { class: 'theme-toggle-icon', 'aria-hidden': 'true' },
              theme.value === 'dark' ? '☀' : '☾'),
            h('span', { class: 'app-header-action-label' },
              theme.value === 'dark' ? 'Light theme' : 'Dark theme'),
          ]),
        ]),
      ]),
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
