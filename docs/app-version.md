# Application version

Dynamic SRS has one application-wide semantic version. The canonical value lives in `src/core/application-version.ts`. `src/app/app.ts` exposes it to the HTML shell, which renders only `vMAJOR.MINOR.PATCH-prerelease` as a small fixed label in the bottom-right corner. `src/core/workspace/workspace-format.ts` uses the same value in newly saved workspace metadata.

The application version is independent of the workspace `FORMAT_VERSION`, document-specific version fields entered by users, and npm package metadata.

## Version policy

Follow [Semantic Versioning 2.0.0](https://semver.org/). Dynamic SRS is still under initial development, so releases remain in the `0.x.x-alpha` series until the application is explicitly promoted beyond alpha.

- **Minor (`0.MINOR.0-alpha`):** a completed user-facing capability or meaningful workflow expansion, including a substantial new SRS phase, document workflow, editor, or saved-data behavior. During the `0.x` period, use a minor increment for an incompatible application or saved-data contract change as well, and document the compatibility impact.
- **Patch (`0.MINOR.PATCH-alpha`):** backward-compatible corrections and user-visible presentation, accessibility, or interaction polish.
- Keep the `-alpha` suffix on normal bumps while the application is unfinished. Changing prerelease maturity (for example, alpha to beta) is an explicit release decision, not a substitute for a numerical bump warranted by changed functionality.
- Group related implementation commits into one completed capability increment. A merge or follow-up implementation commit does not add another bump merely because it is a separate commit.
- Documentation-only changes, internal refactors, behavior-preserving JavaScript/TypeScript migrations, build/deployment tooling, and other infrastructure changes do not independently increment the application version.
- If the `.dsrs` file contract changes, evaluate `FORMAT_VERSION` separately. A workspace-format bump does not replace the application-version decision, and an application bump does not automatically require a format bump.

Agents must review this policy whenever they make a user-facing change and update `src/core/application-version.ts` in the same change when a bump is warranted.

## History-derived alpha baseline

The Git repository begins with an import of an already-developed application, so its commit graph does not contain the complete pre-import feature chronology. The initial repository commit, `b1b1d197` (2026-10-03), already identifies the application as `0.3.0` in multiple independent places:

- `package.json` declared version `0.3.0`.
- `src/core/workspace/workspace-format.js` stamped saved workspaces with application version `0.3.0`.
- `docs/planning-simplification.md` described the active planning contract as application version `0.3.0`.
- `docs/srs-simplification.md` described the active SRS authoring contract as application version `0.3.0`.

That repeated source evidence establishes `0.3.0` as the inherited development milestone rather than a version inferred from the short imported Git history.

From the import through `c8a9d031`, the repository changes are project documentation, webpack/npm migration, strict TypeScript migration and compiler repairs, removal of the old static server/vendor copies, and GitHub Pages deployment. Those changes preserve the existing application functionality and therefore do not justify a feature-version increment under the policy above.

Because the SRS still has unfinished construction phases and is not yet a completed stable application, the formal semantic-version baseline is **`0.3.0-alpha`**.

## Connected evidence correction

`0.3.1-alpha` unifies connected evidence resolution, repairs references to retired source sections, and adds expandable read-only earlier answers to the shared evidence panel. This is a backward-compatible workflow and presentation correction. Workspace format remains 2; stored records and IDs are unchanged.

## AI authoring workflow

`0.4.0-alpha` separates full-tab discovery from scoped form formatting across the app. Interviews receive the complete current-tab schema, eligible record inventory, nested children, and untruncated current answers; earlier connected-project evidence remains omitted. Form copy controls support sections, groups, individual records and nested items, with complete input contracts and supported answers rather than update-only output. This is a meaningful workflow expansion; [AI prompt contract](ai-prompts.md) is authoritative. Workspace format remains 2; stored records and IDs are unchanged.

## Copy-control simplification

`0.4.1-alpha` removes individual-input copy buttons. Section, group, record and nested-item prompts still include all applicable fields and child contracts. Stored data and workspace format are unchanged.

## Reusable unreferenced record IDs

`0.4.2-alpha` makes record deletion and allocation reference-aware. Removing a record with no remaining references releases its numeric ID, and new records fill the lowest safe gap. If any saved value still references the display ID, the record is retired instead and its ID remains reserved. Workspace format remains 2.

## Use-case authoring boundary

`0.5.0-alpha` confines 02.3 Use Cases to identifying and organizing behavior and makes 03.1 Casual Descriptions the authoring/completion owner of `briefDescription` on the same shared records. Saved descriptions, IDs and references remain intact; no migration or workspace-format change is required. Workspace format remains 2.

## AI-generated DrawIO diagrams

`0.5.0-alpha` adds a shared semantic graph-generation prompt and Import AI diagram alongside upload for every editable diagram-file field. The application validates the graph, resolves canonical labels and creates native editable DrawIO XML. Generated diagrams use the existing file payload, FIG IDs, preview/print/download and size limits. No IR is saved and workspace format remains 2. See [AI-generated diagrams](ai-diagrams.md).

## Fluent UI redesign

`0.5.1-alpha` replaces the Bootstrap-led visual language with an application-wide Fluent 2-inspired design system. It introduces semantic Fluent tokens, Segoe/native typography, Fluent control sizing and states, a compact app bar and status strip, Fluent-style tab navigation, calmer form/evidence/diagram/Notes/CBA surfaces, and a low-elevation live document preview. The redesign is presentation and accessibility work only: workspace format, IDs, prompts, calculations, diagram generation, and saved-data behavior are unchanged.

## Comfortable Fluent density

`0.5.2-alpha` keeps the Fluent visual system while restoring a more comfortable authoring scale for the reading- and form-heavy workspace. Body text returns to 16/24, standard desktop controls grow to 40px, headings and helper text are larger, and form/card interiors use more generous spacing. The compact app bar and Fluent color, focus, surface, radius, motion and elevation language remain unchanged. Workspace format and application behavior are unchanged.

## Manual review

Open the application and confirm `v0.5.2-alpha` stays fixed in the bottom-right corner while switching tabs and scrolling. It should remain small, subdued, noninteractive, and clear of the browser safe area. Download a new `.dsrs` workspace and confirm its `application.version` metadata is `0.5.2-alpha`. Existing document-specific version fields and workspace `formatVersion` must remain unchanged.
