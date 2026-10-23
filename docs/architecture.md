# Architecture — blank-slate baseline

Dynamic SRS currently has **only a frontend scaffold**. It deliberately has no SRS schema, persistence, document model, AI agents, prompt protocol, diagrams, or feature registry.

- `src/app/app.ts` — one Vue 3 root component and basic appearance toggle.
- `src/styles/` — Dynamic Learner-inspired semantic tokens and shell conventions.
- `src/html/index.html` — base HTML for the static site.
- `webpack.config.mts` — one webpack entry, live development server, and GitHub Pages-compatible static build.
- `tsconfig*.json` — strict browser/build tool checking.
- `.github/workflows/` — push verification and manual Pages deployment.

The `src/app`, `src/components`, `src/features`, `src/core` layering from Dynamic Learner is a *convention when needed*, not a commitment to reintroduce the previous Dynamic SRS implementation. Future product architecture needs explicit design discussion.
