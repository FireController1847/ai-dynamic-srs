import { specificationFrameSources } from "./evidence.ts";

export const specificationFrameStage = {
  id: "srs-baseline-specification-frame",
  stateKey: "specificationFrame",
  label: "Specification Frame",
  description: "Confirm the SRS purpose, intended audience, product perspective, and unresolved framing decisions from the evidence already collected.",
  documentTargets: ["introduction.purpose-audience", "overall-description.product-perspective"],
  formComponent: "baseline-stage-form",
  previewComponent: "baseline-stage-preview",
  form: {
    kicker: "Phase 1 · Establish the baseline",
    intro: "Turn the prior business case into an explicit purpose, review audience, and product perspective before defining behavior."
  },
  evidence: {
    kicker: "Context carried forward",
    title: "Frame the specification from known purpose and viewpoints",
    summary: "The live source excerpts below provide the business purpose, sponsor authority, affected groups, current operation, and feasibility qualifications. Use them to frame the SRS; do not ask the client to restate them.",
    sources: specificationFrameSources
  },
  guide: {
    title: "How to frame the specification",
    summary: "Define why this SRS exists, who will use it, and how the proposed system relates to the current environment.",
    steps: [
      { title: "State the document purpose", text: "Explain what system or release this SRS specifies and what agreement, design, verification, or approval work it is intended to support." },
      { title: "Name audiences by use", text: "Identify each group that will read, review, approve, design from, verify against, operate from, or otherwise rely on the SRS. A stakeholder is included only when the document serves that group's work." },
      { title: "Describe the product perspective", text: "Relate the proposed system to the current process, organization, external systems, and feasibility decision. Preserve the problem boundary without choosing an unconfirmed implementation." },
      { title: "Expose framing differences", text: "If the prior documents disagree about purpose, audience, or product boundary, record the clarification needed rather than drafting around it." }
    ],
    termsTitle: "Framing terms",
    terms: [
      { term: "Intended audience", definition: "A person or group that will use this specification for a defined review, approval, design, implementation, verification, operational, or maintenance purpose." },
      { term: "Product perspective", definition: "How the proposed product fits into or changes the surrounding business process, organization, systems, and operating environment." }
    ]
  },
  ai: {
    draftingGuidance: "Derive the purpose, audience, and product perspective from connected evidence. Distinguish a stakeholder's interest in the project from a reader's intended use of the SRS. Do not introduce architecture, platforms, or users that the source record does not support.",
    interviewGuidance: "Ask only for the SRS-specific framing decisions that are not already explicit: what agreement the document must establish, who must use or approve it, and whether the source evidence needs clarification."
  },
  sections: [
    {
      id: "purpose-perspective",
      key: "purposePerspective",
      title: "Purpose and product perspective",
      description: "Convert the accepted business context into the SRS's purpose and a defensible view of the product in its environment.",
      help: {
        what: "This section defines the job of the specification and records whether the product perspective implied by the source documents can be carried forward as written.",
        why: "A clear frame keeps later requirements tied to an agreed system and review purpose instead of allowing the document to expand into unrelated project planning or premature design.",
        expectation: "State the system or release being specified and how the SRS will be used. Then assess the source-backed product perspective and explain any clarification, conflict, or missing context."
      },
      fields: [
        { key: "purposeStatement", label: "Purpose of this SRS", type: "textarea", rows: 4, default: "", columns: "col-12", completion: true, placeholder: "What does this specification define, for whom, and for what decisions or work?", aiHint: "Identify the specified product or release and the agreement, design, implementation, verification, or approval work this SRS supports." },
        { key: "productPerspectiveStatus", label: "Product perspective review", type: "select", default: "", columns: "col-md-5", placeholder: "Select a review result", options: ["Supported by prior evidence", "Supported with clarification", "Conflicts with prior evidence", "Insufficient evidence"], completion: true },
        { key: "productPerspectiveClarification", label: "Perspective clarification or correction", type: "textarea", rows: 3, default: "", columns: "col-md-7", showWhen: { key: "productPerspectiveStatus", in: ["Supported with clarification", "Conflicts with prior evidence", "Insufficient evidence"] }, completion: true, placeholder: "What must be clarified, corrected, or supplied before later requirements rely on this perspective?" }
      ]
    },
    {
      id: "intended-audiences",
      key: "intendedAudiences",
      title: "Intended audiences",
      description: "Identify who will use the SRS and the purpose it serves for each audience.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: {
        what: "A canonical list of the people or groups that will read or rely on the SRS, together with their document-specific use and review authority.",
        why: "Writing for a known audience makes the SRS reviewable and usable. It also clarifies who can confirm business meaning, approve scope, design from requirements, and verify outcomes.",
        expectation: "Create one record per materially different use of the SRS. Reuse source stakeholder names, state the relationship to the product, describe how the group will use the specification, and cite supporting source records."
      },
      repeatable: {
        dataKey: "audiences",
        itemLabel: "SRS audience",
        addLabel: "Add intended audience",
        minimum: 1,
        stableIds: true,
        displayId: { prefix: "SRS-AUD-", padding: 3 },
        previewStyle: "list",
        primaryField: "nameOrGroup",
        completionFields: ["nameOrGroup", "usesSpecificationFor"],
        fields: [
          { key: "nameOrGroup", label: "Person or audience group", type: "text", default: "", columns: "col-md-6", placeholder: "Sponsor, development team, representative users…" },
          { key: "relationshipToProduct", label: "Relationship to the product", type: "text", default: "", columns: "col-md-6", placeholder: "Approver, user perspective, builder, verifier, operator…" },
          { key: "usesSpecificationFor", label: "How this audience will use the SRS", type: "textarea", rows: 2, default: "", columns: "col-md-7" },
          { key: "reviewAuthority", label: "Review role", type: "select", default: "", columns: "col-md-5", placeholder: "Select a role", options: ["Approves or accepts", "Reviews and confirms", "Contributes subject expertise", "Designs or implements", "Verifies or validates", "Operates or maintains", "Receives for information"] },
          { key: "sourceReferences", label: "Supporting stakeholder or source IDs", type: "text", default: "", columns: "col-12", placeholder: "FSA-STK-001, sponsor record, CR stakeholder…" }
        ]
      }
    }
  ]
};
