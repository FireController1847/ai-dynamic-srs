export const softwareRequirementsDocument = Object.freeze({
  titleField: "projectName",
  dateDocument: "softwareRequirementsSpecification",
  organizationField: "clientOrganization",
  versionField: "version",
  contextFallbackFields: ["projectName", "clientOrganization"],
  metadata: [
    { key: "preparedBy", label: "Prepared by" },
    { key: "issueDate", label: "Date", format: "date" },
    { key: "version", label: "Version" },
    { key: "documentStatus", label: "Status" }
  ],
  outline: [
    {
      key: "front-matter",
      title: "Front Matter",
      numbered: false,
      sections: [
        { key: "front-matter.document-control", title: "Document Control", numbered: false },
        { key: "front-matter.revision-history", title: "Revision History", numbered: false }
      ]
    },
    {
      key: "introduction",
      title: "Introduction",
      sections: [
        { key: "introduction.purpose-audience", title: "Purpose and Audience" },
        { key: "introduction.scope", title: "Project Scope" },
        { key: "introduction.terms", title: "Terms and Definitions" },
        { key: "introduction.references", title: "References" }
      ]
    },
    {
      key: "overall-description",
      title: "Overall Description",
      sections: [
        { key: "overall-description.product-perspective", title: "Product Perspective" },
        { key: "overall-description.product-features", title: "Product Features" },
        { key: "overall-description.user-classes", title: "User Classes and Characteristics" },
        { key: "overall-description.operating-environment", title: "Operating Environment" },
        { key: "overall-description.constraints", title: "Design and Implementation Constraints" },
        { key: "overall-description.assumptions", title: "Assumptions and Dependencies" }
      ]
    },
    {
      key: "functional-behavior",
      title: "Functional Behavior",
      sections: [
        { key: "functional-behavior.actors-goals", title: "Actors and Goals" },
        { key: "functional-behavior.use-case-model", title: "Use-Case Model" },
        { key: "functional-behavior.use-case-descriptions", title: "Use-Case Descriptions" },
        { key: "functional-behavior.requirements", title: "Functional Requirements" }
      ]
    },
    {
      key: "quality-requirements",
      title: "Quality Requirements",
      sections: [
        { key: "quality-requirements.operational", title: "Operational Requirements" },
        { key: "quality-requirements.performance", title: "Performance Requirements" },
        { key: "quality-requirements.security", title: "Security Requirements" },
        { key: "quality-requirements.cultural-political", title: "Cultural and Political Requirements" }
      ]
    },
    {
      key: "external-interfaces",
      title: "External Interface Requirements",
      sections: [
        { key: "external-interfaces.user", title: "User Interfaces" },
        { key: "external-interfaces.hardware", title: "Hardware Interfaces" },
        { key: "external-interfaces.software", title: "Software Interfaces" },
        { key: "external-interfaces.communication", title: "Communication Interfaces" }
      ]
    },
    {
      key: "analysis-models",
      title: "Analysis Models",
      sections: [
        { key: "analysis-models.activity", title: "Activity Models" },
        { key: "analysis-models.domain", title: "Domain and Class Model" },
        { key: "analysis-models.interaction", title: "Interaction Models" },
        { key: "analysis-models.state", title: "State Models" },
        { key: "analysis-models.interface-design", title: "User Interface Design Evidence" }
      ]
    },
    {
      key: "verification-traceability",
      title: "Verification and Traceability",
      sections: [
        { key: "verification-traceability.coverage", title: "Requirements Coverage" },
        { key: "verification-traceability.traceability", title: "Requirements Traceability" },
        { key: "verification-traceability.verification", title: "Verification Approach" }
      ]
    },
    {
      key: "supporting-information",
      title: "Supporting Information",
      sections: [
        { key: "supporting-information.artifacts", title: "Controlled Figures and Artifacts" },
        { key: "supporting-information.appendices", title: "Appendices and Prior Analysis" }
      ]
    }
  ]
});
