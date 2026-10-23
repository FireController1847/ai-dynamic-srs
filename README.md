<!-- AI coding agents: read AGENTS.md before making changes. -->

# Dynamic SRS

A browser-based workspace for exploring a better way to produce and refine software requirements specifications with AI.

> **Blank-slate redesign:** This branch is a fresh technical starting point. No SRS construction workflow, document schema, agent orchestration, or product features have been chosen or implemented yet. The previous application is preserved on `main`.

## AI development disclosure

Dynamic SRS is intentionally developed through human-directed AI coding assistance, primarily OpenAI Codex. The project owner determines the goals, requirements, and priorities; agents help implement and refine them. AI-produced code is not automatically equivalent to an independently reviewed implementation.

For contributors and coding agents, see [AGENTS.md](AGENTS.md).

## Technical foundation

This scaffold follows the **Dynamic Learner** project's engineering baseline, not the previous Dynamic SRS application:

- Vue 3 with plain TypeScript render-function components; no Vue SFC compiler.
- Strict TypeScript and native ES modules.
- webpack development server and static production builds.
- Fluent-inspired neutral surfaces, blue accent, light/dark themes, responsive layout.
- Node.js 24+ and GitHub Actions build verification.

The home page is intentionally empty. There are no forms, agents, local workspace data, import/export contracts, diagrams, SRS phases, or domain assumptions to preserve. See [architecture](docs/architecture.md) and [design](docs/design.md) for the small amount of scaffolding that exists.

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

## Deployment

`.github/workflows/verify-build.yml` runs on every push. `.github/workflows/deploy-pages.yml` deploys manually through GitHub Actions after a production build. The build supports GitHub Pages' configured base path. Neither a deployment nor a finished application is implied by this redesign branch.

## Origin and future direction

The project is informed by systems analysis and design: discovery, use cases, modeling, traceability, and reconciliation across multiple views of a system. The redesign is intended to reevaluate **how** those activities should be coordinated, including the possibility of parallel AI workstreams. These are research directions, **not implemented features or settled architecture**.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
