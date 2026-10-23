<!-- AI coding agents: read AGENTS.md before making changes. -->

# Dynamic SRS

A browser-based workspace for exploring a better way to produce and refine software requirements specifications with AI.

> **Blank-slate redesign:** This branch is a fresh technical starting point. No SRS construction workflow, domain-specific record schema, or agent orchestration has been chosen yet. The previous application is preserved on `main`.

## AI development disclosure

Dynamic SRS is intentionally developed through human-directed AI coding assistance, primarily OpenAI Codex. The project owner determines the goals, requirements, and priorities; agents help implement and refine them. AI-produced code is not automatically equivalent to an independently reviewed implementation.

For contributors and coding agents, see [AGENTS.md](AGENTS.md).

## Technical foundation

Dynamic SRS uses the following self-contained frontend and build conventions:

- Vue 3 with plain TypeScript render-function components; no Vue SFC compiler.
- Strict TypeScript and native ES modules.
- webpack development server and static production builds.
- Fluent-inspired neutral surfaces, blue accent, responsive layout, and a local theme module with system-following light/dark settings, persisted preferences, and an accessible settings dialog.
- Node.js 24+ and GitHub Actions build verification.

The application has seven navigable document areas: Client Requirements (CR), System Request (SR), Cost-Benefit Analysis (CBA), Feasibility & Stakeholder Analysis (FSA), Software Requirements Specification (SRS), Effort Breakdown (EB), and General Notes (GN). Open the animated three-line menu and select one in the document drawer (or link to `#/documents/<id>`). Client Requirements now has a structured brief for client context, problem or opportunity, desired solution, individually managed requested capabilities, and optional expressed boundaries. A live document preview is assembled from the same structured fields. Optional original client materials can still be attached or referenced. The other document areas remain intentionally empty. No detailed requirements, diagrams, or phased workflows have been implemented. The underlying workspace is stored in IndexedDB. See [architecture](docs/architecture.md), [design](docs/design.md), and [theme behavior](docs/theme.md) for this scaffold's self-contained implementation conventions.

## Run locally

Install Node.js 24 or newer, then:

```powershell
npm ci
npm start
```

Open http://127.0.0.1:3000.

```powershell
npm run typecheck
npm run build
```

The build writes a static site to ignored `dist/`. The development server reloads when source changes. Dependencies are installed with npm and bundled locally; the application has no runtime CDN dependency.

## Local workspace and .dsrs backups

Dynamic SRS stores the active working workspace in the browser's IndexedDB database (`dynamic-srs-data`). Records are keyed individually, with guarded revision updates so future features won't rewrite unrelated data. A `.dsrs` file is a portable JSON snapshot, **not an IndexedDB database dump**.

The document navigation drawer contains **Download .dsrs** and **Import .dsrs** controls. Imports are validated and reviewed before replacing the active workspace; staging and atomic activation prevent partial restores. CR attachments are stored as original file bytes inside the backup, rather than as external file links. Work in this browser is not automatically backed up anywhere else. Themes and other local preferences stay outside the `.dsrs` file.

This redesign starts with `.dsrs` format **version 1**, independent of the IndexedDB schema version. The old Dynamic SRS format v2 is *not* yet supported by the new import contract. See [workspace format and persistence](docs/workspace-data.md).

## Optional CR interpretation\n\nWithin Client Requirements, **Copy AI prompt** prepares a short request to identify business needs, client goals, and unanswered questions. You can use an external AI chat and paste its response into CR as an explicitly labeled draft. No text or documents are automatically sent to an AI provider. Text-based originals are copied into the prompt; uploaded PDF/Word documents must be attached separately to the chat for the AI to read them. Interview answers can be added later without modifying the original material.\n\n## Deployment

`.github/workflows/verify-build.yml` runs on every push. `.github/workflows/deploy-pages.yml` deploys manually through GitHub Actions after a production build. The build supports GitHub Pages' configured base path. Neither a deployment nor a finished application is implied by this redesign branch.

## Origin and future direction

The project is informed by systems analysis and design: discovery, use cases, modeling, traceability, and reconciliation across multiple views of a system. The redesign is intended to reevaluate **how** those activities should be coordinated, including the possibility of parallel AI workstreams. These are research directions, **not implemented features or settled architecture**.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
