# Planning documents — 0.3.0-alpha

CR, SR, CBA and FSA are authored as concise documents. There is no compatibility transform, archive, migration, or alternate legacy schema. Keep each fact in the document where it originates and reuse it downstream.

## Ownership and expected detail

| Document | User supplies | Reused or calculated |
|---|---|---|
| CR | Project identity; problem/current situation; desired outcome with known success measures; stakeholders; needs; boundary; material limits; discovery sources and open questions | This is the initial source of project and stakeholder identity |
| SR | Sponsor; proposed capabilities; expected benefits; new special issues | CR business problem and outcome are live read-only fields. Capabilities can link CR needs by name. Benefits retain automatic capability links. Project identity falls back to CR |
| CBA | Financial settings; supported benefit/cost drivers and timing; citations; a recommendation with brief basis and uncertainty | Project identity comes from CR. SR benefits are evidence. Cash flows, PV, NPV, ROI and break-even are calculated; the copied prompts carry live results |
| FSA | A concise technical assessment; organizational assessment; additional affordability considerations only when needed; material risks/responses; recommendation and necessary conditions | CR stakeholder list, CBA decision and calculated financial results. No duplicate stakeholder catalog or manually entered financial totals |

Normal inputs no longer include per-need classification, per-capability rationale, benefit category/beneficiary questionnaires, a discovery-method checklist, or multiple overlapping feasibility essays and ratings. Unknown priorities default to blank. The recommendation remains distinct from an authorized decision.

CBA retains the mathematical inputs: baseline/target quantities and unit values, retained-value percentages, direct annual amounts, realization patterns, custom annual values, payment years, growth, recurrence, horizon, discount rate, currency and timing convention. Removed fields are descriptive categories, duplicate cost-basis essays, repeated source values/units, confidence/owner bookkeeping and a second intangible-benefit summary. Important nonfinancial benefits remain benefit records. Use source notes for a quoted amount/units when needed to interpret evidence. Discount-rate provenance and material model-wide uncertainty belong in model assumptions.

## Implementation map

- `src/features/planning/schema-helpers.ts`: small declarative field/section helpers; no schema overlay or migration.
- `src/features/planning/help-content.ts`: human guides and section tips for CR/SR/CBA/FSA, separate from schema `ai` instructions and definitions. Guides remain available after completion; helper popovers use prose rather than a fixed three-question template.
- `src/features/client-requirements/schema.ts` and `system-request/schema.ts`: complete active forms.
- `src/features/cost-benefit-analysis/schema.ts`: model settings and decision; `sections/*.ts`: benefits, cost schedules and sources.
- `src/features/feasibility-analysis/sections/*.ts`: distinct feasibility questions; `schema.ts`: composition and carried sources.
- `cost-benefit-analysis/financial-evidence.ts`: shared computed context for FSA and AI. `feasibility-analysis/FeasibilityViews.ts` renders that context without saving copies.
- `app/app.ts`: adds financial context when copying CBA/FSA prompts. The generic prompt builder remains feature-neutral.
- `software-requirements/phase-one/{evidence,preview-model}.ts`: SRS uses the current planning fields.

All cited records retain stable IDs. Removing a financial item retires it; calculations and previews exclude retired records. Financial preview IDs use record IDs rather than filtered row positions. Source selection uses names but saves exact CBA-SRC IDs. Neither selecting a source nor calculating a number establishes that the estimate is confirmed.

The shared interview asks only missing decisions, ends with a numbered inventory and counts, then hands off to field prompts. Optional detail uses a disclosure rather than a second required essay. Completion percentages, bars and completed-tab indicators are available alongside the AI guidance button. Progress uses the current scalar completion flags and declared record completion fields; optional detail, hidden metadata and read-only context do not block completion. Document previews omit empty optional fields.

Application version is 0.3.0-alpha. Workspace format remains 2; it is an independent file-format version.

## Manual handoff — not run

1. Create a project in CR. Confirm SR, CBA and FSA titles reuse it; edit the CR problem and a stakeholder and confirm carried SR/FSA content updates.
2. Add CR needs, link SR capabilities by name, and add benefits beneath capabilities. Confirm links and IDs survive renaming and save/reopen.
3. In CBA exercise baseline/target and direct benefits, gradual/immediate/custom realization, one-time payments, and flat/growing/recurring/custom costs. Compare the displayed results with a trusted hand calculation.
4. Add nonfinancial benefits and source records. Select sources by name, retire an estimate or source, then inspect totals, preserved unavailable links and printed IDs. Retired estimates must not contribute to cash flows.
5. Inspect CBA preview: one financial decision narrative; assumptions, estimate basis and source notes retained; no removed category/confidence/value columns or repeated intangible summary.
6. Copy CBA and FSA prompts. Confirm live calculated results and missing-input warnings appear, without a request to re-enter totals. Guidance should finish with counts and the field-prompt handoff.
7. Confirm FSA has concise technical/organizational assessments, carried CBA results, optional affordability considerations, material risks and a recommendation. Print it and inspect the carried evidence.
8. Open SRS baseline/discovery prompts and previews; confirm the condensed CR/SR/FSA context remains available. No missing old paragraph should become a new required task.
9. Save/reopen a fresh workspace. Confirm no migration/recovery UI and no automatic claim of approval. Check the optional disclosure labels and accessible controls manually. Confirm completion percentages and bars update as essential answers and records are filled, completed tabs show their indicators, and blank optional fields do not block completion.
10. With several CR stakeholders, fill the FSA technical assessment, organizational assessment, recommendation and decisive reason, plus the statement on each added risk. Confirm FSA reaches 100% with optional fields blank. Adding or removing CR stakeholders must not change FSA progress; clearing an essential FSA answer must lower it.
11. Expand each planning document’s guide, including on a completed tab, and inspect its section tips with mouse and keyboard. Confirm the guide explains the actual workflow and tips contain no missing values or three-question headings. Copy the separate interview and section prompts; confirm the AI instructions, definitions, financial context and references are still supplied.

No builds, tests, browser checks or automated verification were run for this change, at the user's request.

## Compact planning previews

The first four schemas opt into `compactPreview`. Generic previews use bulleted records with supporting details beneath each entry and inline field labels instead of a heading per answer. CBA preserves financial schedules and lists supporting citations. Compact covers and spacing use `styles/compact-documents.css`, loaded by both the app and the print window. The compact marker lives on `.document-content` so it survives print cloning. Detailed records remain free to flow across pages.

This is presentation only: saved answers, IDs, schemas’ field definitions and calculations are unchanged. Remove the `compactPreview` flag to restore generic full-size layout; CBA citations remain a list. Manually inspect all four previews and print/PDF output with short and long records, multiline notes, source URLs and multi-year tables. No automated checks were run.
