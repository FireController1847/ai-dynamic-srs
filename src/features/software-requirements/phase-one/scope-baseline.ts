import { scopeBaselineSources } from "./evidence.ts";

export const scopeBaselineStage = {
  id: "srs-baseline-scope",
  stateKey: "scopeBaseline",
  label: "Scope Baseline",
  description: "Reconcile the proposed boundary, major capabilities, exclusions, and success intent before behavioral modeling begins.",
  documentTargets: ["introduction.scope", "overall-description.product-features"],
  formComponent: "baseline-stage-form",
  previewComponent: "baseline-stage-preview",
  form: {
    kicker: "Phase 1 · Establish the baseline",
    intro: "Accept, qualify, or reconcile the boundary already described by the CR, SR, and FSA before actors and use cases make it more detailed."
  },
  evidence: {
    kicker: "Boundary evidence",
    title: "Reconcile needs, capabilities, exclusions, and feasibility conditions",
    summary: "These source records describe the same proposed system at different levels. Compare them directly, then record only the decisions needed to make one reliable boundary.",
    sources: scopeBaselineSources
  },
  guide: {
    title: "How to establish the SRS scope baseline",
    summary: "Make the project boundary coherent before detailed behavioral analysis begins.",
    steps: [
      { title: "Compare the boundary statements", text: "Check the Client Requirements' inclusions and exclusions against the System Request capabilities and special issues." },
      { title: "Apply feasibility conditions", text: "Determine whether risks, decision gates, or recommended alternatives narrow, defer, or condition any requested capability." },
      { title: "Check capability coverage", text: "Every high-level product feature should respond to a supported client need, and every must-have need should be represented or explicitly deferred, excluded, or unresolved." },
      { title: "Record only material decisions", text: "Use a scope-decision record when something is included, excluded, deferred, treated as a constraint, or preserved as an assumption. Cite the source IDs that led to the decision." }
    ],
    termsTitle: "Scope terms",
    terms: [
      { term: "Scope baseline", definition: "The current agreed boundary against which later actors, use cases, requirements, and models are evaluated." },
      { term: "Product feature", definition: "A concise high-level capability of the product, derived from the business need and refined later into behavioral requirements." }
    ]
  },
  ai: {
    draftingGuidance: "Compare rather than concatenate the CR needs and scope, SR capabilities and issues, and FSA risks and conditions. Flag uncovered needs, unsupported capabilities, and conflicting boundaries. Do not turn an assumption, benefit, or feasibility concern into a product capability.",
    interviewGuidance: "Use the connected records as the agenda. Ask the user to decide only real discrepancies, gaps, exclusions, deferrals, and conditions; do not ask them to rewrite the existing scope."
  },
  sections: [
    {
      id: "boundary-review",
      key: "boundaryReview",
      title: "Boundary and capability review",
      description: "Decide whether the prior scope and capability statements form one consistent starting boundary.",
      help: {
        what: "This is the reconciliation checkpoint between client needs, the proposed system boundary, high-level business capabilities, special issues, and feasibility conditions.",
        why: "Actors and use cases quickly multiply ambiguity. Resolving boundary differences now prevents later behavioral work from elaborating excluded, unsupported, or infeasible capabilities.",
        expectation: "Choose a boundary disposition and a capability-coverage result. Explain every qualification, conflict, gap, or blocked decision with source record IDs."
      },
      fields: [
        { key: "scopeDisposition", label: "Boundary disposition", type: "select", default: "", columns: "col-md-5", placeholder: "Select a disposition", options: ["Accepted from prior evidence", "Accepted with clarification", "Requires reconciliation", "Blocked by conflict or missing decision"], completion: true },
        { key: "scopeReconciliation", label: "Boundary clarification or reconciliation", type: "textarea", rows: 3, default: "", columns: "col-md-7", showWhen: { key: "scopeDisposition", in: ["Accepted with clarification", "Requires reconciliation", "Blocked by conflict or missing decision"] }, completion: true, placeholder: "Identify the mismatch, affected source IDs, and current resolution or next decision." },
        { key: "capabilityAlignment", label: "Needs-to-capabilities coverage", type: "select", default: "", columns: "col-md-5", placeholder: "Select a review result", options: ["Aligned", "Aligned with visible gaps", "Conflicting", "Not yet reviewed"], completion: true },
        { key: "capabilityAlignmentNotes", label: "Coverage gaps, unsupported capabilities, or conflicts", type: "textarea", rows: 3, default: "", columns: "col-md-7", showWhen: { key: "capabilityAlignment", in: ["Aligned with visible gaps", "Conflicting", "Not yet reviewed"] }, completion: true, placeholder: "Which need or capability is uncovered, unsupported, duplicated, or inconsistent?" }
      ]
    },
    {
      id: "scope-decisions",
      key: "scopeDecisions",
      title: "Scope decisions",
      description: "Capture only the material dispositions needed to turn the prior documents into one usable boundary.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: {
        what: "A canonical record of inclusions, exclusions, deferrals, constraints, and assumptions adopted while reconciling the SRS boundary.",
        why: "An explicit decision is traceable and revisable; an unrecorded interpretation becomes a hidden inconsistency when later stages derive use cases and requirements.",
        expectation: "Add a record only when a material scope choice is necessary. State one decision, explain why it follows from the evidence, cite exact source IDs, and keep unapproved choices proposed."
      },
      repeatable: {
        dataKey: "scopeDecisions",
        itemLabel: "Scope decision",
        addLabel: "Add scope decision",
        minimum: 0,
        stableIds: true,
        displayId: { prefix: "SRS-SCP-", padding: 3 },
        previewStyle: "list",
        primaryField: "statement",
        completionFields: ["decisionType", "statement"],
        fields: [
          { key: "decisionType", label: "Disposition", type: "select", default: "", columns: "col-md-4", placeholder: "Select a disposition", options: ["Include", "Exclude", "Defer", "Constraint", "Assumption"] },
          { key: "status", label: "Decision status", type: "select", default: "Proposed", columns: "col-md-4", options: ["Proposed", "Confirmed", "Superseded"] },
          { key: "owner", label: "Decision authority", type: "text", default: "", columns: "col-md-4" },
          { key: "statement", label: "Scope statement", type: "textarea", rows: 3, default: "", columns: "col-12" },
          { key: "rationale", label: "Rationale", type: "textarea", rows: 2, default: "", columns: "col-md-6" },
          { key: "sourceReferences", label: "Source record IDs", type: "text", default: "", columns: "col-md-6", placeholder: "CR-002, SR-BR-004, FSA-RISK-001…" }
        ]
      }
    }
  ]
};
