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

## Manual review

Open the application and confirm `v0.3.0-alpha` stays fixed in the bottom-right corner while switching tabs and scrolling. It should remain small, subdued, noninteractive, and clear of the browser safe area. Download a new `.dsrs` workspace and confirm its `application.version` metadata is `0.3.0-alpha`. Existing document-specific version fields and workspace `formatVersion` must remain unchanged.
