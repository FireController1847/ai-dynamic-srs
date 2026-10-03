# Architecture

## Runtime flow

`npm start` launches the zero-dependency `server.mjs` static server and redirects `/` to `src/html/index.html`. The page loads Bootstrap, Vue, and `src/app/app.js`. The app imports the feature registry, generic Vue components, and browser controllers. The feature registry supplies ordered page schemas and specialized feature components.

```text
HTML entry
  → app/app.js
    → features/feature-registry.js
      → feature schemas and specialized components
    → components/*
      → core schema/value/prompt helpers
    → core/workspace/* and core/printing/*
```

## Dependency direction

```text
app → features → components → core
app ───────────────────────→ core
```

`core` must remain unaware of features. Generic components must not contain CBA, Notes, feasibility, or other document-specific vocabulary.

## Directory responsibilities

- `src/app`: root Vue state and browser workflow coordination.
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

Schemas define defaults. `state-factory.js` creates or normalizes every page state when a workspace is created or loaded. Vue components can therefore operate on normalized state.

Workspace data passes through this boundary:

```text
JSON parse → version validation → state normalization
```

There is no migration layer. Schemas define the current authoring contract; normalization preserves undeclared saved values without converting them.

## UI ownership

Vue owns page selection, subpage selection, forms, previews, autosave status, and transient copied/printing state. Bootstrap supplies visual utilities plus tooltip/popover positioning through Vue directives. Direct DOM access is restricted to browser workflows such as scrolling, printing, clipboard fallback, and file download.

## Planning documents

CR, SR, CBA and FSA use concise declarative helpers from `features/planning/schema-helpers.js`. Shared input sections reference canonical data through `dataPath`; they do not copy it. CBA financial input schemas are split under its `sections/` directory. `financial-evidence.js` owns the calculated context used by feasibility views and clipboard prompts; `app.copyMarkdown` adds that feature-owned context for CBA/FSA. Generic components and core do not import financial logic. See `planning-simplification.md` for the field boundaries.
