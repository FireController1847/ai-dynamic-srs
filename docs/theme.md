# Theme module

Dynamic SRS owns its theme state and visual styles within this repository. The appearance system is independent from the workspace content model and from `.dsrs` files.

## Module ownership

- `src/app/theme.ts` owns the theme registry, selected theme, follow-system preference, `prefers-color-scheme` listener, persistence and cross-tab synchronization.
- `src/app/theme-menu.ts` opens/closes the accessible settings modal and restores focus.
- `src/app/theme-picker.ts` renders Follow system and the applicable theme selectors.
- `src/components/popup-dialog.ts` and `src/components/use-dialog.ts` provide the reusable native-dialog lifecycle.
- `src/styles/tokens.css` defines sizing, typography and motion values. `src/styles/themes.css` defines semantic light/dark palettes. `src/styles/theme.css` and `popup-dialog.css` style the settings UI.
- `src/html/index.html` resolves the initial theme before the app mounts to avoid a wrong-theme flash. `src/app/app.ts` initializes theme state and renders the settings trigger.

## Current behavior

- Two registered themes: `light` and `dark`. A theme declares an ID, label, appearance, and browser color.
- The default is **Follow system = true**, mapping light system appearance to `light` and dark system appearance to `dark`.
- When following the system, the user selects which registered theme to use for each appearance. When not following the system, the user chooses a single theme.
- `window.matchMedia('(prefers-color-scheme: dark)')` updates the active theme when operating-system appearance changes.
- The active theme is applied to `document.documentElement.dataset.theme` and the browser's `meta[name="theme-color"]`.
- The native dialog supports keyboard focus, Escape dismissal, backdrop dismissal, and focus restoration. Controls use shared CSS tokens and reduced-motion rules.

## Preference storage

The current preferences are stored under `localStorage['dynamic-srs.theme-preferences']`, with fields `theme`, `followSystem`, `lightTheme`, and `darkTheme`. Invalid or unavailable storage falls back to defaults. An earlier toggle preference under `dynamic-srs.theme` is read for compatibility and promoted when preferences are saved. Browser tabs synchronize preference changes through the `storage` event.

Theme preferences are **not SRS records**, are not saved in IndexedDB, and are not included in portable `.dsrs` backups. Never write appearance choices into the SRS document content or file format.

## Extending themes

Add themes through the registry in `src/app/theme.ts` and their matching CSS palette selectors. Preserve theme-ID validation, appearance-matched choices, default fallbacks, system tracking, initial HTML bootstrapping, and accessible UI. Components should reference semantic CSS variables instead of branching on theme IDs or duplicating palette values.

Manual verification: first visit in light/dark OS modes, manual override, Follow system switching, OS appearance change, reload, storage denial/corrupt preferences, another tab's update, modal keyboard/escape/focus, and small screens.
