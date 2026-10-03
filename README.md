<!-- If you are an AI coding agent working in this repository, start with [`AGENTS.md`](https://github.com/FireController1847/ai-dynamic-srs/blob/main/AGENTS.md). -->

<h1 align="center">Dynamic SRS</h1>

<p align="center">
  A browser-native planning workspace for developing project evidence, assessing feasibility, and building a software requirements specification one decision at a time.
</p>

<p align="center">
  <a href="https://github.com/FireController1847/ai-dynamic-srs/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/FireController1847/ai-dynamic-srs?style=for-the-badge">
  </a>
  <a href="https://github.com/FireController1847/ai-dynamic-srs/network/members">
    <img alt="GitHub forks" src="https://img.shields.io/github/forks/FireController1847/ai-dynamic-srs?style=for-the-badge">
  </a>
  <a href="https://github.com/FireController1847/ai-dynamic-srs/commits/main">
    <img alt="Last commit" src="https://img.shields.io/github/last-commit/FireController1847/ai-dynamic-srs?style=for-the-badge">
  </a>
  <a href="LICENSE">
    <img alt="Apache 2.0 license" src="https://img.shields.io/github/license/FireController1847/ai-dynamic-srs?style=for-the-badge">
  </a>
</p>

## AI development disclosure

> [!IMPORTANT]
> **Dynamic SRS is intentionally developed as an AI-generated workspace.** The project owner directs the product, requirements, priorities, and feedback; AI coding agents — primarily OpenAI Codex — create and revise much of the implementation and repository content in response.

Development is generally directed in natural language, implemented by AI agents, reviewed through the resulting behavior and diffs, and revised from there. This differs from a conventional workflow where most changes are written by hand and maintained through manual pull requests.

That distinction matters when reading the codebase:

- AI-generated code should not be assumed to have received independent line-by-line human review.
- A commit or pull request may represent an agent's implementation of a human-directed change rather than a hand-authored patch.
- Bug reports, ideas, and feedback are useful even when an AI agent performs the eventual implementation.
- [`AGENTS.md`](AGENTS.md) contains instructions for coding agents. This README is the human-facing project overview, rather than a task log or agent scratchpad.

## What is Dynamic SRS?

Dynamic SRS connects the documents used to understand a project, propose it, evaluate it, and specify its behavior. Earlier answers become live context for later work, so the same problem, stakeholder, capability, or requirement does not need to be entered in several places.

The current application includes:

| Document or tool | What it does |
| --- | --- |
| **Client Requirements (CR)** | Captures project identity, the current problem, desired outcomes, stakeholders, needs, boundaries, discovery sources, and open questions. |
| **System Request (SR)** | Reuses the client context to describe the sponsor, proposed capabilities, expected benefits, and material issues. Capabilities link to client needs, and benefits can be grouped beneath their capability. |
| **Cost-Benefit Analysis (CBA)** | Models supported benefit drivers, one-time costs, recurring costs, timing, and sources. Calculates cash flows, present values, NPV, ROI, and discounted break-even to support an economic recommendation. |
| **Feasibility & Stakeholder Analysis (FSA)** | Combines carried stakeholders and live CBA results with technical and organizational assessments, material risks, and a recommendation with necessary conditions. |
| **Software Requirements Specification (SRS)** | Guides baseline definition, actor and goal discovery, use-case elaboration, diagrams, functional requirements, quality requirements, interfaces, and assumptions using shared records and stable links. |
| **Effort Breakdown (EB)** | Assigns task points and responsibility percentages to up to five team members, then compares their weighted contributions. |
| **General Notes (GN)** | Maintains a running notebook with optional references and dated explanations of meaningful edits. |

The interface combines responsive forms, document previews, progress indicators, and human-readable guides. Optional detail stays optional. Project context and linked records are carried forward without creating separate catalogs for each stage.

### Building the SRS

The implemented construction workflow covers four phases:

1. **Establish Baseline:** review evidence, define the specification's purpose and readers, establish scope, and clarify vocabulary.
2. **Discover Actors & Goals:** identify user classes, external interacting roles, goals, and use cases.
3. **Describe Behavior:** refine use-case descriptions, upload use-case and activity diagrams, develop event flows, and derive functional requirements.
4. **Specify Quality & Interfaces:** describe operating conditions, measurable quality expectations, external contracts, assumptions, and dependencies.

Later phases for model cross-checks, reconciliation, and complete SRS assembly are currently placeholders. Construction order is separate from finished-document order: a stage can contribute to several document sections while retaining the same underlying records.

Human guides and section tips explain the forms directly. Separate copy buttons provide Markdown prompts for an external AI conversation: an interview prompt helps resolve missing decisions, and section prompts request scoped field updates. Using the forms does not require an AI conversation.

Diagram uploads retain their actual files in the workspace. Copied text prompts include diagram metadata, rather than binary or XML payloads.

## Try it

Install Node.js 24 or newer, clone the repository, and run:

```bash
git clone https://github.com/FireController1847/ai-dynamic-srs.git
cd ai-dynamic-srs
npm ci
npm start
```

Then open **[http://127.0.0.1:3000](http://127.0.0.1:3000)**.

The webpack development server compiles the application and reloads the page as source files change. Vue, Bootstrap and the pagination library are installed through npm and included in the generated site; they do not require a runtime CDN connection. Installing dependencies requires network access. DrawIO previews load the official diagrams.net viewer on demand.

To create a production build:

```bash
npm run build
```

The complete static site is written to `dist/`. `npm run pages:prepare` runs the same build. Generated output is ignored by Git; commit the source and lockfile. Serve or publish the contents of `dist/` rather than opening the source HTML directly.

To use a different address or port in macOS or Linux:

```bash
HOST=127.0.0.1 PORT=8080 npm start
```

Document and stage previews can be printed through the browser's print dialog, including saving to PDF where supported.

For hosting beneath a repository path, set the deployment base when building:

```bash
PAGES_BASE_PATH=/ai-dynamic-srs/ npm run pages:prepare
```

The generated HTML, application bundles and print assets use that base path. Publishing the site is a separate step.

## Your workspace data

Dynamic SRS autosaves the current workspace locally in the browser and restores it when you return. Project data is not stored in an account or remote database.

The header includes **New WIP**, **Import WIP**, and **Download WIP** controls. Downloading produces a gzip-compressed `.dsrs` file containing the workspace answers and uploaded diagrams. Importing replaces the active workspace; download a backup first when you want to keep the current work separately.

The current application version is **0.3.0**, and new workspace files use **format version 2**. Imported data passes through validation and schema normalization. Undeclared saved values are preserved without rewriting their meaning.

If the browser's site data is cleared without a downloaded backup, locally saved project content may be lost. Workspace downloads are excluded from Git because they can contain client answers and uploaded project material.

Browser storage belongs to the site's origin, including its port. If you have an existing workspace at the previous local address, run `PORT=4173 npm start` to reuse it, or download a backup there and import it at the new address.

Resolved shared questions and accepted exceptions are hidden from the shared questions panel but remain saved and available in Evidence Intake.

## Project shape

Dynamic SRS deliberately keeps its runtime simple:

- `webpack.config.mjs` owns the development server, production build, generated HTML, extracted CSS and deployment base path.
- `src/html/index.html` is the HTML template, and `src/app/app.js` is the JavaScript bundle entry. Source remains JavaScript ES modules with plain Vue components.
- Vue, Bootstrap and Paged.js are pinned npm dependencies. Vue includes the template compiler for existing inline templates; Paged.js and supporting print styles are emitted for the separate print document.
- Vue owns application state, forms, navigation, and previews. Bootstrap JavaScript supplies isolated tooltips and popovers.
- Features and document schemas live under `src/features`; shared application coordination lives under `src/app`.
- Generic Vue renderers live under `src/components`, and feature-neutral helpers live under `src/core`.
- Schemas describe fields and relationships; specialized calculations and document behavior belong to their features.

For technical structure, see [architecture](docs/architecture.md). For where a change belongs, see [change routing](docs/change-routing.md). The active authoring contracts are described in [planning simplification](docs/planning-simplification.md) and [SRS simplification](docs/srs-simplification.md); the [construction workflow](docs/srs-construction-workflow.md) documents shared records and preview placement.

If you are an AI coding agent working in this repository, start with [`AGENTS.md`](AGENTS.md).

## License

Dynamic SRS is licensed under the [Apache License 2.0](LICENSE).
