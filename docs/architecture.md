# Architecture

## Runtime flow

Install dependencies with `npm ci` using Node.js 24 or newer. `npm start` launches webpack-dev-server at `http://127.0.0.1:3000`; `HOST` and `PORT` override the address. The server compiles in memory and reloads the page after source changes. `npm run typecheck` checks browser and Node TypeScript without emitting files. `npm run build` runs that check first, then emits the complete static site into ignored `dist/`; `npm run pages:prepare` runs the same production build.

`webpack.config.mts` uses `src/html/index.html` as the HTML template and `src/app/app.ts` as the TypeScript entry. HTML injection loads the emitted bundles and extracted CSS. The app imports Vue, Bootstrap CSS, the application styles, feature registry, generic components, and browser controllers. The feature registry supplies ordered page schemas and specialized feature components. Vue aliases to the full ESM bundler build so the existing HTML shell and string component templates can compile at runtime; DefinePlugin supplies Vue's feature flags. Only the Bootstrap tooltip and popover modules are imported.

```text
Generated HTML and bundled CSS/JavaScript
  → app/app.js
    → features/feature-registry.js
      → feature schemas and specialized components
    → components/*
      → core schema/value/prompt helpers
    → core/workspace/* and core/printing/*
```

## Application version

`src/core/application-version.ts` owns the single canonical application semantic version. The root Vue app exposes it to the HTML shell, which renders a fixed, noninteractive `vMAJOR.MINOR.PATCH-prerelease` label in the bottom-right corner. `core/workspace/workspace-format.ts` imports the same constant when stamping newly saved workspace metadata, so display and saved application metadata cannot drift.

The application semantic version is release metadata and is independent of the `.dsrs` workspace `FORMAT_VERSION` and npm package metadata. See [app-version.md](app-version.md) for the bump policy and history-derived alpha baseline.

## Bundled and print assets

Runtime dependencies come from npm and are pinned in `package.json` and `package-lock.json`. The previous checked-in `lib/` copies and `server.mjs` have been removed. The subsequent TypeScript migration retained the same runtime architecture and plain Vue component model while converting application and build source to strict TypeScript.

MiniCssExtractPlugin and css-loader bundle Bootstrap and the application's CSS imports. Production uses content-hashed JS/CSS, shared chunks, JavaScript/CSS minimization, and a clean output directory. CopyPlugin emits the project license, dependency licenses and `.nojekyll` alongside the application.

Printing runs in a separate iframe. CopyPlugin therefore also emits `assets/paged.polyfill.js` and the independent Markdown/compact-document styles under `assets/print/`. The print helper resolves these URLs through `document.baseURI`; they are not injected as application scripts or substituted with source-tree URLs. Paged.js remains isolated to the print document. DrawIO preview continues to load its official diagrams.net viewer on demand.

The default deployment base is `/`. Set `PAGES_BASE_PATH=/ai-dynamic-srs/` when building for a repository subdirectory; webpack's public path and the HTML `<base>` use the same normalized value. Publish the generated `dist/` contents, rather than `src/html/` or the repository root. The development server serves compiled output only, so workspace files and the repository are not exposed by a generic static file server. Autosave retains the same storage keys and `.dsrs` validation boundary. Browser storage remains scoped to the origin; use `PORT=4173 npm start` to reuse the previous development origin, or import a downloaded backup at the new default port.

## Manual migration verification

Builds, tests and browser checks remain manual at the user's request. This migration has not run them.

1. Run `npm ci`, then `npm start`. Confirm the seven tabs, human guides, progress, Bootstrap tips and copied prompts work. Edit a source file and confirm live reload.
2. Save and import a `.dsrs` workspace with diagrams and existing IDs. Verify autosave and restored navigation; use the prior port or a backup when moving between origins.
3. Print planning documents and SRS stage previews, including Markdown, compact layouts and uploaded figures. Confirm pagination completes and all print assets load.
4. Run `npm run build` and serve `dist/`. Inspect the app, licenses and print behavior. Repeat with `PAGES_BASE_PATH=/ai-dynamic-srs/` under that subdirectory; app bundles and print assets must use the same base.

## TypeScript boundary

Source modules under `src/` use strict TypeScript. Saved workspace/import data remains an open runtime boundary: validators and guards narrow unknown input before typed application code consumes it. Build tooling uses `.mts` with Node.js 24-compatible erasable syntax and explicit TypeScript import extensions.

## Dependency direction

```text
app → features → components → core
app ───────────────────────→ core
```

`core` must remain unaware of features. Generic components must not contain CBA, Notes, feasibility, or other document-specific vocabulary.

## Directory responsibilities

- `src/app`: root Vue state and browser workflow coordination.
- `src/core/application-version.ts`: canonical application semantic version.
- `src/core/ai`: schema-driven Markdown prompt generation.
- `src/core/bootstrap`: narrow adapters around Bootstrap JavaScript.
- `src/core/formatting`: shared display formatting.
- `src/core/printing`: isolated printable-document creation.
- `src/core/records`: value and record-ID primitives.
- `src/core/schema`: state construction, visibility, completion, and shared schema options.
- `src/core/workspace`: `.dsrs` construction, validation, storage, import, and download.
- `src/components`: generic schema-driven Vue components.
- `src/features`: page schemas and specialized feature behavior.
- `src/styles`: styles split by broad rendering responsibility.

## State boundary

Schemas define defaults. `state-factory.ts` creates or normalizes every page state when a workspace is created or loaded. Vue components can therefore operate on normalized state.

Workspace data passes through this boundary:

```text
JSON parse → version validation → state normalization
```

There is no migration layer. Schemas define the current authoring contract; normalization preserves undeclared saved values without converting them.

## UI ownership

Vue owns page selection, subpage selection, forms, previews, autosave status, and transient copied/printing state. Bootstrap supplies visual utilities plus tooltip/popover positioning through Vue directives. Direct DOM access is restricted to browser workflows such as scrolling, printing, clipboard fallback, and file download.

## Planning documents

CR, SR, CBA and FSA use concise declarative helpers from `features/planning/schema-helpers.ts`. Shared input sections reference canonical data through `dataPath`; they do not copy it. CBA financial input schemas are split under its `sections/` directory. `financial-evidence.ts` owns the calculated context used by feasibility views and clipboard prompts; `app.copyMarkdown` adds that feature-owned context for CBA/FSA. Generic components and core do not import financial logic. See `planning-simplification.md` for the field boundaries.
