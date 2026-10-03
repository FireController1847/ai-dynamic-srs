const clientIdentity = {
  sectionId: "project-details",
  fieldKeys: ["projectName", "clientOrganization", "primaryContact", "preparationDate", "version"]
};

const clientContext = {
  sectionId: "business-context",
  fieldKeys: ["businessProblem", "desiredOutcome"]
};

const clientNeeds = {
  sectionId: "client-needs",
  recordFieldKeys: ["statement", "priority", "source"]
};

const clientScope = {
  sectionId: "scope-constraints",
  fieldKeys: ["inScope", "outOfScope", "constraints", "assumptions"]
};

const requestNeed = {
  sectionId: "business-need",
  fieldKeys: ["businessProblem", "desiredOutcome"]
};

const requestCapabilities = {
  sectionId: "business-requirements",
  recordFieldKeys: ["statement", "priority", "source"]
};

const requestIssues = {
  sectionId: "special-issues",
  recordFieldKeys: ["issueStatement", "status", "responseAndSource"]
};

const feasibilityStakeholders = {
  sectionId: "stakeholder-analysis",
  recordFieldKeys: ["name", "role", "interest"]
};

const feasibilityRecommendation = {
  sectionId: "overall-recommendation",
  fieldKeys: ["overallRecommendation", "recommendationRationale", "conditionsToProceed"]
};

const feasibilityRisks = {
  sectionId: "feasibility-risks",
  recordFieldKeys: ["riskStatement", "mitigationOrCondition", "riskStatus"]
};

const notebookEntries = {
  sectionId: "notebook-entries",
  recordFieldKeys: ["body"]
};

function priorStageSource(stageId, stateKey, reason, groups) {
  return {
    pageId: "software-requirements-specification",
    nodeId: stageId,
    dataPath: ["softwareRequirementsSpecification", "baselineConstruction", stateKey],
    subpageSelections: {
      "software-requirements-specification": "srs-establish-baseline",
      "srs-establish-baseline": stageId
    },
    reason,
    groups
  };
}

const evidenceBaselineSource = priorStageSource(
  "srs-baseline-evidence-intake",
  "evidenceIntake",
  "Carries forward the accepted evidence boundary and every visible source exception.",
  [
    {
      sectionId: "baseline-decision",
      fieldKeys: ["evidenceReviewStatus", "evidenceCutoffDate", "baselineSummary"]
    },
    {
      sectionId: "baseline-exceptions",
      recordFieldKeys: ["description", "sourcePageId", "status", "affectedDecision", "resolution", "sourceReferences"]
    }
  ]
);

const specificationFrameSource = priorStageSource(
  "srs-baseline-specification-frame",
  "specificationFrame",
  "Keeps the agreed document purpose, product perspective, and intended review audiences visible.",
  [
    {
      sectionId: "specification-purpose",
      fieldKeys: ["purposeStatement", "productPerspective"]
    },
    {
      sectionId: "intended-audiences",
      recordFieldKeys: ["nameOrGroup", "relationshipToProduct", "usesSpecificationFor", "reviewAuthority", "sourceReferences"]
    }
  ]
);

const scopeBaselineSource = priorStageSource(
  "srs-baseline-scope",
  "scopeBaseline",
  "Carries the reconciled boundary, coverage review, and explicit scope decisions into terminology review.",
  [
    {
      sectionId: "boundary-review",
      fieldKeys: ["scopeDisposition", "scopeReconciliation", "capabilityAlignment", "capabilityAlignmentNotes"]
    },
    {
      sectionId: "scope-decisions",
      recordFieldKeys: ["statement", "decisionType", "status", "rationale", "sourceReferences"]
    }
  ]
);

export const evidenceIntakeSources = [
  {
    pageId: "client-requirements",
    reason: "Original client language, discovery boundary, and unresolved questions.",
    referenceRole: "Discovery record and original statement of client need",
    groups: [
      clientIdentity,
      {
        sectionId: "discovery-record",
        fieldKeys: ["discoverySources", "openQuestions"]
      }
    ]
  },
  {
    pageId: "system-request",
    reason: "Approved business framing, sponsor, high-level capabilities, and special issues.",
    referenceRole: "Business case and authorized high-level capability request",
    groups: [
      {
        sectionId: "request-details",
        fieldKeys: ["projectName", "requestingOrganization", "requestDate", "version"]
      },
      {
        sectionId: "project-sponsor",
        fieldKeys: ["sponsorName", "sponsorTitle", "sponsorOrganization", "sponsorCommitment"]
      }
    ]
  },
  {
    pageId: "cost-benefit-analysis",
    reason: "Economic assumptions, decision interpretation, and the supporting source register.",
    referenceRole: "Financial source of truth and economic evidence",
    groups: [
      {
        sectionId: "model-setup",
        fieldKeys: ["analysisDate", "version", "analysisYears", "discountRate", "modelAssumptions"]
      },
      {
        sectionId: "financial-summary",
        fieldKeys: ["financialInterpretation", "economicRecommendation", "intangibleCosts"]
      },
      {
        sectionId: "evidence-sources",
        recordFieldKeys: ["item", "sourceType", "sourceName", "reference", "notes"]
      }
    ]
  },
  {
    pageId: "feasibility-stakeholder-analysis",
    reason: "Feasibility conclusion, conditions, material risks, and evidence cutoff.",
    referenceRole: "Feasibility decision evidence and conditions for continuation",
    groups: [
      {
        sectionId: "analysis-details",
        fieldKeys: ["analysisDate", "version"]
      },
      feasibilityRecommendation
    ]
  },
  {
    pageId: "general-notes",
    reason: "Traceable working knowledge that may explain decisions or expose unresolved context.",
    referenceRole: "Supporting notebook; cited only when an entry materially informs the specification",
    groups: [notebookEntries]
  }
];

export const specificationFrameSources = [
  evidenceBaselineSource,
  {
    pageId: "client-requirements",
    reason: "Defines the problem, current operation, desired outcome, and original stakeholder viewpoints.",
    groups: [
      clientContext,
      {
        sectionId: "stakeholders",
        recordFieldKeys: ["name", "role", "interest"]
      }
    ]
  },
  {
    pageId: "system-request",
    reason: "Identifies the accountable sponsor and the business purpose authorized for further analysis.",
    groups: [
      {
        sectionId: "project-sponsor",
        fieldKeys: ["sponsorName", "sponsorTitle", "sponsorOrganization", "sponsorCommitment"]
      },
      requestNeed
    ]
  },
  {
    pageId: "feasibility-stakeholder-analysis",
    reason: "Shows whose review matters and whether the proposed product perspective remains supportable.",
    groups: [
      feasibilityStakeholders,
      {
        sectionId: "organizational-feasibility",
        fieldKeys: ["organizationalConclusion"]
      },
      feasibilityRecommendation
    ]
  }
];

export const scopeBaselineSources = [
  evidenceBaselineSource,
  specificationFrameSource,
  {
    pageId: "client-requirements",
    reason: "Carries forward the client boundary, constraints, assumptions, and individually identified needs.",
    groups: [clientScope, clientNeeds]
  },
  {
    pageId: "system-request",
    reason: "Supplies the proposed product capabilities and the issues that qualify or challenge them.",
    groups: [requestCapabilities, requestIssues]
  },
  {
    pageId: "feasibility-stakeholder-analysis",
    reason: "Applies feasibility conditions and open risks before the behavioral boundary is accepted.",
    groups: [feasibilityRisks, feasibilityRecommendation]
  }
];

export const vocabularyBaselineSources = [
  evidenceBaselineSource,
  specificationFrameSource,
  scopeBaselineSource,
  {
    pageId: "client-requirements",
    reason: "Preserves the client's names for people, outcomes, capabilities, data, and constraints.",
    groups: [clientNeeds, clientScope]
  },
  {
    pageId: "system-request",
    reason: "Shows the business-domain wording already used in capability and issue statements.",
    groups: [requestCapabilities, requestIssues]
  },
  {
    pageId: "feasibility-stakeholder-analysis",
    reason: "Provides established stakeholder-group names and terminology introduced by feasibility analysis.",
    groups: [feasibilityStakeholders, feasibilityRisks]
  },
  {
    pageId: "general-notes",
    reason: "Surfaces alternate wording, definitions, and ambiguities recorded during project work.",
    groups: [notebookEntries]
  }
];
