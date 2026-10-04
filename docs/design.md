# Visual system

Dynamic SRS takes its visual basis from Microsoft Fluent 2, implemented with native CSS so the Vue/Bootstrap runtime stays lightweight. This is a Fluent-inspired implementation rather than a claim of certified Fluent conformance.

Primary references:

- [Typography](https://fluent2.microsoft.design/typography)
- [Layout and spacing](https://fluent2.microsoft.design/layout)
- [Design tokens](https://fluent2.microsoft.design/design-tokens)
- [Color](https://fluent2.microsoft.design/color)
- [Elevation](https://fluent2.microsoft.design/elevation)
- [Motion](https://fluent2.microsoft.design/motion)
- [Accessibility](https://fluent2.microsoft.design/accessibility)
- [Button](https://fluent2.microsoft.design/components/web/react/core/button/usage/)
- [Tablist](https://fluent2.microsoft.design/components/web/react/core/tablist/usage)
- [Field](https://fluent2.microsoft.design/components/web/react/core/field/usage/)

## Design contract

- Use the Segoe UI/native platform font stack. Dynamic SRS uses a roomier authoring density than Fluent's compact defaults: normal workspace text is 16/24, supporting text is generally 14/20, and headings stay restrained and semibold.
- Use the four-pixel spacing rhythm. Prefer proximity and whitespace over decorative dividers or stacks of floating cards.
- Neutral surfaces establish hierarchy. Blue is reserved for the primary action, current selection, focus/accent states and meaningful links. Green, amber and red communicate semantic success, warning and danger states.
- Keep one visually primary action in a local action group. Secondary and utility actions use neutral, subtle, or transparent appearances.
- Desktop authoring controls use a 40px shared height where practical. The compact app bar may use smaller chrome controls; coarse-pointer/touch layouts retain at least 44px interactive targets.
- Shared controls use 4px corners; containers use 8px corners. Elevation is purposeful: ordinary workspace surfaces are stroked and flat, while the live paper preview and floating utilities may use low elevation.
- Motion must explain state or movement, not decorate. Use short transitions and respect `prefers-reduced-motion`.
- Keyboard focus must remain clearly visible. Preserve labels and helper text instead of relying on placeholders, and keep semantic status colors readable without making color the only cue.

## Implementation map

| Concern | Owner |
| --- | --- |
| Semantic colors, typography, spacing, radii, motion, elevation | `src/styles/tokens.css` |
| Shared buttons, inputs, cards, badges, tables, focus and reduced motion | `src/styles/base.css` |
| App bar, workspace status, top-level tabs, responsive chrome | `src/styles/shell.css` |
| Forms, nested tabs, progress, guides, evidence, diagrams, Notes, CBA, live preview | `src/styles/fluent-workspace.css` |
| Feature-specific layout or visualization | Existing feature stylesheet such as `cba.css`, `notes.css`, or `diagram-artifacts.css` |
| Browser print/PDF behavior | `src/styles/responsive-print.css`, `compact-documents.css`, preview/print helpers |

Bootstrap CSS remains installed because the application already uses its grid/utilities and isolated overlay behavior. Do not treat Bootstrap defaults as the visual source of truth: application CSS loads afterward and owns the actual product appearance.

## Shell and navigation

The header is a compact app bar with identity on the left and workspace actions on the right. Only **Download WIP** is visually primary; New and Import are neutral actions. Autosave state and file-format information sit in a quiet status strip rather than competing with the application title.

Top-level documents and nested workflow categories remain tablists because they switch closely related content in place. Active tabs use a restrained brand underline and semibold text. Dense tab sets may scroll on constrained layouts rather than wrapping labels into multiple rows; labels remain short and sentence case.

The form progress sidebar acts as a passive inline information surface. It stays visually flat and uses neutral section links rather than looking like a separate floating application.

## Forms and information surfaces

Logical form sections are calm white surfaces with neutral strokes, 8px container radii and no routine shadow. Inputs use the Fluent field pattern: persistent label, neutral border, stronger lower edge, and brand focus state. Help and copy actions are low-emphasis icon controls until hovered or focused.

The page guide uses a brand-tinted informational surface. Connected evidence is an inline drawer-like surface made of neutral groups. Diagram, Notes and CBA content reuse the same card, metric-tile and semantic-status grammar instead of defining independent palettes.

The live document preview is intentionally different from the application chrome: it remains white paper on the neutral workspace with low elevation. Screen-only Fluent overrides never change the document's print/PDF contract.

## Responsive and accessibility review

On desktop, inspect the app bar, every top-level tab, a normal planning form, all four implemented SRS phases, Notes, Effort Breakdown, CBA charts/tables, evidence panels, diagram upload/preview and live document output. Confirm there are no leftover Bootstrap-blue buttons, rounded shadow cards, oversized headings, or feature-specific palettes that compete with Fluent tokens.

At phone width and with a coarse pointer, confirm header actions remain reachable, tabs can be reached without wrapping into unreadable rows, controls meet the 44px touch target, the progress sidebar stacks cleanly, dialogs/popovers remain usable, and the paper preview removes unnecessary elevation at the screen edge. Try keyboard-only navigation and visible focus, browser zoom, forced colors, and reduced motion. Printing/PDF should retain the document-focused styling rather than the application chrome.

No automated visual or browser verification is implied by this document; follow the repository verification rule in `AGENTS.md`.
