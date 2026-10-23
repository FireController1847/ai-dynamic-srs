# Design baseline

The application uses a Fluent-inspired, neutral interface with semantic styling tokens, restrained blue accents, and system typography.

- The compact header displays the current document title, a three-line navigation trigger, and the existing accessible theme dialog.
- The navigation drawer lists seven distinct documents (CR, SR, CBA, FSA, SRS, EB, GN) with stable, shareable `#/documents/<id>` URLs and an active-document indicator.
- The same overlay drawer is used at all screen sizes: opening the three-line menu fades in a scrim and slides the drawer into view, without taking permanent space from the page. Its close glyph animates from three lines into an X. The drawer supports outside-click dismissal, Escape, keyboard focus management, reduced motion, small-screen touch targets, and device safe areas. The selected view retains its own document content.
- Workspace-level **Download .dsrs** and **Import .dsrs** controls live at the bottom of the drawer. Restoring requires a confirmation dialog; storage is browser-local.
- Light/dark palettes are defined by `src/styles/themes.css`, and components consume tokens rather than hard-coded mode-specific colors.
- Keyboard navigation, focus visibility, escape-to-close for the narrow sidebar, touch-friendly targets, responsive layouts, and reduced-motion settings remain baseline requirements.

Client Requirements (CR) now has a deliberately lightweight intake: paste the client's exact words or upload and retain an original document, then optionally expand AI interpretation or interview notes. Originals, AI drafts, and human-provided follow-ups are visually distinct, additive, and never conflated. All other document areas remain empty until their workflows are specified. There are no CR completion gates or automatically created technical requirements.

The application shell has one explicit, full-height document scrollport beneath the header. The document drawer remains a separate modal layer, never a layout column. CR uses a bounded two-column editor/preview layout on wide screens and a single-column layout on narrow ones; its preview does not use sticky positioning, to avoid covering the editor during repaints or scrolling. The development server serves assets with no-store response headers so a local rebuild or branch switch does not mix stale styles with new views.
