import { vocabularyBaselineSources } from "./evidence.ts";

export const vocabularyBaselineStage = {
  id: "srs-baseline-vocabulary",
  stateKey: "vocabularyBaseline",
  label: "Vocabulary Baseline",
  description: "Establish one shared vocabulary from prior records and flag terms that are inconsistent, ambiguous, or still undefined.",
  documentTargets: ["introduction.terms"],
  formComponent: "baseline-stage-form",
  previewComponent: "baseline-stage-preview",
  form: {
    kicker: "Phase 1 · Establish the baseline",
    intro: "Normalize the names that later actors, use cases, requirements, and models must use consistently."
  },
  evidence: {
    kicker: "Language already in use",
    title: "Find important terms before they become model inconsistencies",
    summary: "Review the exact domain language already used across needs, capabilities, scope, stakeholders, risks, and project notes. Define only terms whose meaning matters to the specification.",
    sources: vocabularyBaselineSources
  },
  guide: {
    title: "How to establish a shared vocabulary",
    summary: "Create the small, controlled language set that every later SRS representation will reuse.",
    steps: [
      { title: "Collect consequential terms", text: "Look for business objects, events, actor-group names, process names, statuses, policies, acronyms, and words whose interpretation changes scope or behavior." },
      { title: "Resolve synonyms and collisions", text: "When different sources name the same concept differently—or use one word for different concepts—choose a preferred term and preserve the conflict in its status or source note." },
      { title: "Define meaning, not implementation", text: "Write a concise project-specific definition. Do not turn the glossary into a data model, design specification, or generic dictionary." },
      { title: "Make later work reuse it", text: "Actors, use cases, requirements, diagrams, and interfaces should use confirmed terms. Later phases may refine or reopen a term when a model exposes a mismatch." }
    ],
    termsTitle: "Vocabulary terms",
    terms: [
      { term: "Controlled term", definition: "A project-specific word, phrase, or acronym with one agreed meaning that later specification records and models should reuse." },
      { term: "Terminology conflict", definition: "Different names for the same concept or the same name used for materially different concepts." }
    ]
  },
  ai: {
    draftingGuidance: "Extract candidate terms only from the connected workspace evidence. Prefer the client's domain language, define it in the context of this system, preserve conflicting usage, and do not invent data entities, actors, statuses, acronyms, or policies.",
    interviewGuidance: "Show the user the source wording that creates ambiguity, then ask for the preferred term and intended meaning. Do not conduct a general requirements interview at this stage."
  },
  sections: [
    {
      id: "vocabulary-review",
      key: "vocabularyReview",
      title: "Vocabulary review",
      description: "Record whether the current controlled vocabulary is coherent enough for actor and behavior discovery.",
      help: {
        what: "A checkpoint confirming whether consequential terms from the baseline sources have been defined and reconciled for consistent later use.",
        why: "Small naming differences become large modeling differences. Confirming the vocabulary early gives actors, use cases, requirements, and diagrams the same domain language.",
        expectation: "Choose a review result. When terminology remains incomplete or inconsistent, identify the terms, source wording, and clarification still needed."
      },
      fields: [
        { key: "vocabularyStatus", label: "Vocabulary readiness", type: "select", default: "", columns: "col-md-5", placeholder: "Select readiness", options: ["Confirmed for the next phase", "Confirmed with pending terms", "Needs terminology reconciliation"], completion: true },
        { key: "vocabularyNotes", label: "Pending terms or terminology conflicts", type: "textarea", rows: 3, default: "", columns: "col-md-7", showWhen: { key: "vocabularyStatus", in: ["Confirmed with pending terms", "Needs terminology reconciliation"] }, completion: true, placeholder: "Identify the term, conflicting source language, and clarification required." }
      ]
    },
    {
      id: "controlled-terms",
      key: "controlledTerms",
      title: "Controlled terms and definitions",
      description: "Maintain the canonical vocabulary reused by every later SRS phase and model.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: {
        what: "The shared catalog of project-specific terms, acronyms, role names, business objects, statuses, events, and other language that must have one controlled meaning.",
        why: "One canonical catalog prevents each tab or diagram from defining its own vocabulary and makes terminology conflicts visible when later models refine the analysis.",
        expectation: "Add one term per record. Give it a concise project-specific definition, cite the source wording or IDs, choose its review status, and use notes only for aliases, excluded meanings, or unresolved conflict."
      },
      repeatable: {
        dataKey: "terms",
        itemLabel: "Controlled term",
        addLabel: "Add term",
        minimum: 1,
        stableIds: true,
        displayId: { prefix: "SRS-TERM-", padding: 3 },
        previewStyle: "list",
        primaryField: "term",
        completionFields: ["term", "definition"],
        fields: [
          { key: "term", label: "Preferred term or acronym", type: "text", default: "", columns: "col-md-5" },
          { key: "status", label: "Status", type: "select", default: "", columns: "col-md-3", placeholder: "Select a status", options: ["Confirmed", "Needs clarification", "Conflicting usage", "Deprecated alias"] },
          { key: "sourceReferences", label: "Source wording or record IDs", type: "text", default: "", columns: "col-md-4", placeholder: "CR-001, SR-BR-003, FSA-STK-002…" },
          { key: "definition", label: "Project-specific definition", type: "textarea", rows: 3, default: "", columns: "col-md-7" },
          { key: "usageNotes", label: "Aliases, excluded meanings, or clarification notes", type: "textarea", rows: 3, default: "", columns: "col-md-5" }
        ]
      }
    }
  ]
};
