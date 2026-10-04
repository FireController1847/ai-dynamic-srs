import { promptGuidance } from "../workflow/prompt-guidance.ts";
import { issueFollowUpFields } from "../issue-follow-up.ts";
import { evidenceIntakeSources } from "./evidence.ts";

export const evidenceIntakeStage = {
  id: "srs-baseline-evidence-intake",
  stateKey: "evidenceIntake",
  label: "Evidence Intake",
  description: "Connect the client requirements, system request, cost-benefit analysis, feasibility analysis, and notes without re-entering their contents.",
  documentTargets: ["introduction.references", "supporting-information.appendices"],
  formComponent: "baseline-stage-form",
  previewComponent: "baseline-stage-preview",
  form: {
    kicker: "Phase 1 · Establish the baseline",
    intro: "Review the connected project record, choose the evidence boundary for this SRS, and record only conflicts or gaps that must remain visible."
  },
  evidence: {
    kicker: "Evidence already in this workspace",
    title: "Start with the project record—not a blank page",
    summary: "These are live views of the documents that led to the SRS. Update a source at its origin; use this stage only to decide whether the collected evidence is fit to become the specification baseline.",
    sources: evidenceIntakeSources
  },
  guide: {
    title: "How to establish an evidence baseline",
    summary: "Confirm which prior work the SRS may rely on before drafting new specification content.",
    steps: [
      { title: "Review the connected documents", text: "Compare project identity, dates, versions, scope, recommendations, source quality, and unresolved questions across the CR, SR, CBA, FSA, and project notebook." },
      { title: "Set an evidence boundary", text: "Record the latest date represented by the evidence being accepted. Newer information can be incorporated later through a deliberate review rather than silently changing the baseline." },
      { title: "Record exceptions, not copies", text: "When sources disagree or omit information needed for the SRS, add one issue that identifies the source, affected decision, and required resolution. Do not reproduce the source document here." },
      { title: "Decide readiness honestly", text: "A baseline may be ready with visible exceptions. Mark it blocked only when a source correction or missing decision prevents responsible SRS construction." }
    ],
    termsTitle: "Baseline terms",
    terms: [
      { term: "Evidence baseline", definition: "The identified set of source documents, records, decisions, and dates that the SRS currently treats as its starting point." },
      { term: "Baseline exception", definition: "A contradiction, ambiguity, missing source, or unresolved decision that must remain visible while the SRS is built." }
    ]
  },
  ai: {
    ...promptGuidance["srs-baseline-evidence-intake"]
  },
  sections: [
    {
      id: "baseline-decision",
      key: "baselineDecision",
      title: "Baseline decision",
      description: "State whether the current project record is usable and the boundary of the evidence accepted for this SRS.",
      help: {
        what: "This is the analyst's explicit decision about whether the existing project record is sufficiently coherent and current to support progressive SRS construction.",
        why: "A specification assembled from inconsistent or unidentified sources can look complete while carrying hidden contradictions. A dated baseline makes the starting evidence reviewable.",
        expectation: "Choose the least optimistic readiness status supported by the connected documents, record the evidence cutoff, and summarize what is accepted plus any important qualification."
      },
      fields: [
        {
          key: "evidenceReviewStatus",
          label: "Evidence readiness",
          type: "select",
          default: "",
          columns: "col-md-5",
          placeholder: "Select readiness",
          options: ["Ready to build", "Ready with visible exceptions", "Blocked by source correction or missing authority"],
          completion: true,
          aiHint: "Choose a status supported by the connected evidence; visible exceptions do not automatically prevent construction."
        },
        {
          key: "evidenceCutoffDate",
          label: "Evidence reviewed through",
          type: "date",
          default: "",
          columns: "col-md-4",
          completion: true,
          aiHint: "Use the latest date represented by the accepted evidence, not today's date by assumption."
        },
        {
          key: "baselineOwner",
          label: "Baseline reviewed by",
          type: "text",
          default: "",
          columns: "col-md-3",
          placeholder: "Analyst or review group",
          aiHint: "Identify the person or group that actually reviewed the source set."
        },
        {
          key: "baselineSummary",
          label: "Accepted baseline and qualifications",
          type: "textarea",
          rows: 4,
          default: "",
          columns: "col-12",
          completion: true,
          placeholder: "What evidence is accepted, what remains provisional, and what may not be inferred?",
          aiHint: "Summarize the accepted source set, important limits, and any visible exceptions without reproducing source content."
        }
      ]
    },
    {
      id: "baseline-exceptions",
      key: "baselineExceptions",
      title: "Evidence gaps and conflicts",
      description: "Track contradictions and missing decisions once so later phases can resolve them without losing their origin.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: {
        what: "A shared register of source conflicts, ambiguities, missing evidence, stale information, and authority questions discovered while establishing the SRS baseline.",
        why: "Keeping exceptions in one canonical register prevents later stages from making different silent assumptions about the same gap.",
        expectation: "Add only material issues. Identify the source, describe the exact conflict or gap, explain the SRS decision it affects, and record a resolution only when confirmed."
      },
      repeatable: {
        dataKey: "evidenceIssues",
        itemLabel: "Baseline issue",
        addLabel: "Add evidence issue",
        minimum: 0,
        stableIds: true,
        displayId: { prefix: "SRS-ISS-", padding: 3 },
        previewStyle: "list",
        primaryField: "description",
        completionFields: ["sourcePageId", "issueType", "description"],
        fields: [
          {
            key: "sourcePageId",
            label: "Source document",
            type: "select",
            default: "",
            columns: "col-md-4",
            placeholder: "Select a source",
            options: [
              { value: "client-requirements", label: "Client Requirements" },
              { value: "system-request", label: "System Request" },
              { value: "cost-benefit-analysis", label: "Cost-Benefit Analysis" },
              { value: "feasibility-stakeholder-analysis", label: "Feasibility & Stakeholder Analysis" },
              { value: "general-notes", label: "General Notes" },
              { value: "software-requirements-specification", label: "Software Requirements Specification" },
              { value: "cross-source", label: "Multiple or cross-source" }
            ]
          },
          { key: "issueType", label: "Issue type", type: "select", default: "", columns: "col-md-4", placeholder: "Select a type", options: ["Conflict", "Ambiguity", "Missing evidence", "Stale evidence", "Missing authority", "Other"] },
          { key: "status", label: "Status", type: "select", default: "Open", columns: "col-md-4", options: ["Open", "Under review", "Resolved", "Accepted exception"] },
          { key: "description", label: "Gap or conflict", type: "textarea", rows: 3, default: "", columns: "col-12", placeholder: "State exactly what is inconsistent, unclear, missing, or no longer current." },
          { key: "affectedDecision", label: "SRS decision affected", type: "textarea", rows: 2, default: "", columns: "col-md-6", placeholder: "Scope, audience, terminology, use-case boundary…" },
          { key: "resolution", label: "Confirmed resolution or next evidence needed", type: "textarea", rows: 2, default: "", columns: "col-md-6" },
          { key: "owner", label: "Resolution owner", type: "text", default: "", columns: "col-md-6" },
          { key: "sourceReferences", label: "Source record IDs or precise locators", type: "text", default: "", columns: "col-md-6", placeholder: "CR-003, SR-SI-002, meeting/date…" },
          ...issueFollowUpFields
        ]
      }
    }
  ]
};
