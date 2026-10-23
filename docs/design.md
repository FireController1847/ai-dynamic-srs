# Design baseline

The initial appearance is intentionally based on **Dynamic Learner**, not the previous Dynamic SRS interface.

- Fluent-inspired neutral surfaces, restrained blue accents, system font, semantic CSS variables and compact controls.
- Light and dark color palettes in `src/styles/themes.css`; visual components should consume tokens instead of hard-coded theme-specific colors.
- Theme settings match Dynamic Learner: an accessible dialog with Follow system, per-appearance theme choices, local preferences, and updates when OS appearance changes.
- A simple 48px application header, wide padded content area, centered 1080px max-width home column, and unobtrusive version label.
- Keyboard accessibility, focus visibility, touch-sized interactions, responsive layouts, and reduced-motion preferences are baseline requirements.
- The empty state is intentionally *not* a mock SRS dashboard. Only storage status and backup/restore controls have been added; do not introduce section tabs, agent tiles, documents, or workflow controls before the user chooses that direction.

Adapt these conventions only in response to actual new requirements.
