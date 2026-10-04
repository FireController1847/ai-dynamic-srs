import { stakeholderSources } from "./evidence.ts";

export const stakeholderPerspectivesStage = {
  id: "srs-discovery-perspectives", stateKey: "stakeholderPerspectives", label: "Stakeholder Perspectives",
  description: "Build on the stakeholder analysis to identify user characteristics, expectations, and missing viewpoints before naming actors.",
  documentTargets: ["overall-description.user-classes"],
  formComponent: "evidence-form", previewComponent: "placed-stage-preview",
  form: { kicker: "Phase 2 · Discover actors and goals", intro: "Reuse the people already identified. Add the perspective that will shape system behavior." },
  evidence: { title: "Stakeholders and boundary already established", summary: "Open the original analysis when needed. Cite its IDs here; stakeholder influence and contact details remain there.", sources: stakeholderSources },
  guide: {
    title: "From stakeholders to system viewpoints",
    summary: "Someone can care about a system without interacting with it. Capture both kinds of perspective.",
    steps: [
      { title: "Review existing stakeholders", text: "Use the Client Requirements and feasibility analysis. Add a missing stakeholder at the source, then reference that record here." },
      { title: "Identify distinct expectations", text: "Record the outcome that matters and characteristics that affect use: experience, frequency, accessibility, or authority." },
      { title: "Check interaction", text: "Does the group exchange information with the proposed system? Sponsors and approvers are not automatically actors." },
      { title: "Revisit the baseline", text: "If a viewpoint reveals missing scope or conflicting terminology, cite the Phase 1 issue or decision and return there to resolve it." }
    ],
    terms: [
      { term: "Stakeholder perspective", definition: "An expectation or viewpoint that the specification represents, whether or not its owner uses the software." },
      { term: "User class", definition: "Users whose characteristics or manner of interaction affect the requirements." }
    ]
  },
  ai: {
    includeSiblingContext: true,
    draftingGuidance: "Reuse connected stakeholder records and cite their stable IDs. Add system-relevant expectations and user characteristics, not a duplicate stakeholder analysis. Sponsors and document audiences are not automatically actors. Mark unsupported characteristics and missing viewpoints for clarification; do not invent people or accessibility needs.",
    interviewGuidance: "Start from known stakeholder interests. Ask about missing expectations, characteristics that affect interaction, and whether each group exchanges information with the system. Reopen baseline conflicts explicitly. Do not ask for a complete functional-requirement list."
  },
  sections: [
    {
      id: "perspective-review", key: "perspectiveReview", title: "Review the represented viewpoints",
      previewTitle: "User Classes and Characteristics", documentTarget: "overall-description.user-classes",
      description: "Check who is represented and which voices or expectations are still missing.",
      help: { what: "A review of viewpoints carried from stakeholder discovery into system analysis.", why: "Missing perspectives become missing behavior later.", expectation: "Choose the review state and describe any omitted group, disputed expectation, or baseline issue by source ID." },
      fields: [
        { key: "perspectiveReadiness", label: "Viewpoint coverage", type: "select", default: "", placeholder: "Select review result", options: ["Reviewed", "Reviewed with open questions", "Needs stakeholder clarification"], completion: true, columns: "col-md-5" },
        { key: "perspectiveNotes", label: "Missing viewpoints or conflicting expectations", type: "textarea", default: "", rows: 3, columns: "col-md-7", showWhen: { key: "perspectiveReadiness", in: ["Reviewed with open questions", "Needs stakeholder clarification"] }, completion: true, placeholder: "Identify the gap and the source, SRS-ISS, or SRS-SCP record to revisit." }
      ]
    },
    {
      id: "stakeholder-perspectives", key: "stakeholderPerspectives", title: "Relevant perspectives",
      documentTarget: "overall-description.user-classes", documentSubsection: 1,
      description: "One record per distinct viewpoint; reuse stakeholder identities by reference.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: { what: "Expectations and user characteristics that guide actor discovery.", why: "Roles are derived from interaction, while non-user interests remain visible.", expectation: "Cite the stakeholder, state the expected outcome, describe relevant characteristics, and explain whether direct interaction is expected." },
      repeatable: {
        dataKey: "perspectives", itemLabel: "Perspective", addLabel: "Add perspective", minimum: 1, stableIds: true,
        displayId: { prefix: "SRS-VPT-", padding: 3 }, primaryField: "viewpoint", previewStyle: "list", completionFields: ["viewpoint", "sourceReferences", "expectation"],
        fields: [
          { key: "viewpoint", label: "Viewpoint or user class", type: "text", default: "", columns: "col-md-6", placeholder: "Name the role or group in the established vocabulary." },
          { key: "sourceReferences", label: "Stakeholder or source IDs", type: "text", default: "", columns: "col-md-6", placeholder: "FSA-STK-001, CR stakeholder ID…" },
          { key: "expectation", label: "Expected outcome or concern", type: "textarea", default: "", rows: 3, columns: "col-md-6" },
          { key: "characteristics", label: "Characteristics that affect use", type: "textarea", default: "", rows: 3, columns: "col-md-6", placeholder: "Experience, frequency, accessibility, authority—only where supported." },
          { key: "interaction", label: "Relationship to system interaction", type: "select", default: "", placeholder: "Select relationship", options: ["Direct interaction expected", "Interest without direct interaction", "Needs clarification"], columns: "col-md-5" },
          { key: "interactionNotes", label: "Interaction evidence or clarification needed", type: "textarea", default: "", rows: 2, columns: "col-md-7" }
        ]
      }
    }
  ]
};
