// Additive fields on the canonical SRS-ISS records, shared by all issue views.
export const issueFollowUpFields = [
  { key: "affectedReferences", label: "Affected SRS record IDs", type: "text", default: "", columns: "col-md-6", placeholder: "SRS-UC-001, SRS-FR-002, FIG-0001…" },
  { key: "resolveByPhase", label: "Resolve by phase", type: "select", default: "", columns: "col-md-6", placeholder: "Choose when the answer is needed", options: [
    { value: "3", label: "Phase 3 · Behavior" },
    { value: "4", label: "Phase 4 · Quality and interfaces" },
    { value: "5", label: "Phase 5 · Model cross-checks" },
    { value: "6", label: "Phase 6 · Reconciliation" },
    { value: "7", label: "Phase 7 · Assembly" }
  ] },
  { key: "nextAction", label: "Next action and evidence needed", type: "textarea", default: "", rows: 2, placeholder: "Who will answer which question, using what evidence, before which dependent work proceeds?" },
  { key: "resolutionEvidence", label: "Resolution evidence / acceptance authority", type: "textarea", default: "", rows: 2, placeholder: "Cite the confirmed answer, reviewer and date, and corrected record IDs. An accepted exception must state its limits and authority." }
];

export const followUpGuidance = "Before moving on, revisit earlier questions. Resolve them in their canonical records or link an existing SRS-ISS issue with an owner, affected IDs, next action, and resolution phase. Preserve the question's origin. Close an issue only with a confirmed resolution, evidence, and updates to the affected records; an accepted exception remains visible for final review.";
