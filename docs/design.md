# Design baseline

The application uses a Fluent-inspired, neutral interface with semantic styling tokens, restrained blue accents, and system typography.

- The 48px header provides a document-sidebar toggle and the existing accessible theme dialog.
- The sidebar lists seven distinct documents (CR, SR, CBA, FSA, SRS, EB, GN) with stable, shareable `#/documents/<id>` URLs and an active-document indicator.
- The sidebar is collapsible on desktop and becomes an overlay drawer on narrow screens. The selected view has its own title, description, and intentionally blank content area.
- Workspace-level **Download .dsrs** and **Import .dsrs** controls live at the bottom of the sidebar. Restoring requires a confirmation dialog; storage is browser-local.
- Light/dark palettes are defined by `src/styles/themes.css`, and components consume tokens rather than hard-coded mode-specific colors.
- Keyboard navigation, focus visibility, escape-to-close for the narrow sidebar, touch-friendly targets, responsive layouts, and reduced-motion settings remain baseline requirements.

The document views are a navigation foundation, not a commitment to a particular SRS workflow or content-editing UI. Add content functionality as its requirements are defined.
