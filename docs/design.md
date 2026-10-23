# Design baseline

The application uses a Fluent-inspired, neutral interface with semantic styling tokens, restrained blue accents, and system typography.

- The compact header displays the current document title, a three-line navigation trigger, and the existing accessible theme dialog.
- The navigation drawer lists seven distinct documents (CR, SR, CBA, FSA, SRS, EB, GN) with stable, shareable `#/documents/<id>` URLs and an active-document indicator.
- The same overlay drawer is used at all screen sizes: opening the three-line menu fades in a scrim and slides the drawer into view, without taking permanent space from the page. Its close glyph animates from three lines into an X. The drawer supports outside-click dismissal, Escape, keyboard focus management, reduced motion, small-screen touch targets, and device safe areas. The selected view retains its own document content.
- Workspace-level **Download .dsrs** and **Import .dsrs** controls live at the bottom of the drawer. Restoring requires a confirmation dialog; storage is browser-local.
- Light/dark palettes are defined by `src/styles/themes.css`, and components consume tokens rather than hard-coded mode-specific colors.
- Keyboard navigation, focus visibility, escape-to-close for the narrow sidebar, touch-friendly targets, responsive layouts, and reduced-motion settings remain baseline requirements.

Client Requirements (CR) uses a compact structured client brief. The client context, desired solution, and individual high-level capabilities are primary; problem or opportunity is explicitly optional and belongs here only when expressed by the client. Boundaries and original source material remain optional disclosures. CR has no AI or interview workflows, completion gates, or technical requirements.

The application shell has one explicit, full-height document scrollport beneath the header. The document drawer remains a separate modal layer, never a layout column. CR provides Editor / Split / Preview layout controls for wide and narrow screens (defaulting to Split on desktop and Editor on smaller screens). All modes share one manual Save brief control and explicit state: unsaved edits, saving, save errors, or saved locally. Only populated fields appear in the live preview; it is derived from the brief rather than persisted separately. The preview is not sticky, to avoid covering the editor. The development server serves assets with no-store response headers so a local rebuild or branch switch does not mix stale styles with new views.
