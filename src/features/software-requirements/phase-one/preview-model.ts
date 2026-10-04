import type { DataModel, DocumentModel, Field, SchemaNode } from "../../../core/schema/schema-types.ts";
import type { BaselinePreviewModel } from "../simplification/preview.ts";
import { simplifyBaselinePreview } from "../simplification/preview.ts";
import { issueFollowUpFields } from "../issue-follow-up.ts";
import { formatRecordDisplayId } from "../../../core/records/record-values.ts";
import { completion, hasCompletionCriteria } from "../../../core/schema/form-completion.ts";
import { evidenceIntakeSources } from "./evidence.ts";
import {
  carriedFeatureDisposition,
  childNumber,
  decisionStatements,
  evidenceLines,
  field,
  latestFeatureDecision,
  outlineNumber,
  populatedRecords,
  previewPage,
  rootRecords,
  schemaSection,
  sourceData,
  sourceHasMeaningfulEvidence,
  stageSection
} from "./preview-support.ts";

function optionLabel(field: Field | undefined, value: unknown): string | undefined {
  const option = field?.options?.find((candidate) => (
    typeof candidate === "object" ? candidate.value === value : candidate === value
  ));
  if (option === undefined) return undefined;
  return typeof option === "object" ? option.label : String(option);
}

type BaselineBuilder = (
  stage: SchemaNode,
  localData: DataModel,
  documentModel: DocumentModel,
  documentSchemas: readonly SchemaNode[]
) => BaselinePreviewModel;

function sourceReferences(documentModel: DocumentModel, documentSchemas: readonly SchemaNode[]): DataModel[] {
  return evidenceIntakeSources.map((definition, index) => {
    const { data, schema } = sourceData(documentModel, documentSchemas, definition.pageId);
    if (!schema || !sourceHasMeaningfulEvidence(definition, schema, data, documentModel)) {
      return null;
    }

    const versionKey = schema?.document?.versionField || "version";
    const tracked = schema ? hasCompletionCriteria(schema) : false;

    return {
      id: index + 1,
      sourceTitle: schema?.title || definition.pageId,
      sourceVersion: data[versionKey] || "Not identified",
      baselineUse: definition.referenceRole || definition.reason,
      reviewStatus: tracked
        ? `${completion(schema, data, documentModel)}% complete in the current workspace`
        : "Available as a supporting project record"
    };
  }).filter(Boolean);
}

function buildEvidenceIntake(stage: SchemaNode, localData: DataModel, documentModel: DocumentModel, documentSchemas: readonly SchemaNode[]): BaselinePreviewModel {
  const issueFields = stageSection(stage, "baseline-exceptions")?.repeatable?.fields || [];
  const evidenceIssues = populatedRecords(rootRecords(documentModel).evidenceIssues, issueFields);
  const references = sourceReferences(documentModel, documentSchemas);
  const data = {
    ...localData,
    evidenceIssues: evidenceIssues.map((issue) => ({
      ...issue,
      sourceTitle: optionLabel(issueFields.find(({ key }) => key === "sourcePageId"), issue.sourcePageId)
        || String(issue.sourcePageId || "")
    })),
    sourceReferences: references,
    priorAnalysisDisposition: `${references.length} connected project ${references.length === 1 ? "record is" : "records are"} controlled in the workspace and cited from the SRS reference baseline. Their source contents remain at their canonical locations instead of being duplicated in this partial specification.`
  };

  return {
    data,
    page: previewPage(stage, [
      {
        id: "preview-reference-baseline",
        key: "previewReferenceBaseline",
        title: "References",
        documentNumber: outlineNumber("introduction.references"),
        numberFields: false,
        fields: [
          field("evidenceReviewStatus", "Evidence readiness", "text"),
          field("evidenceCutoffDate", "Evidence reviewed through", "date"),
          field("baselineOwner", "Baseline reviewed by", "text"),
          field("baselineSummary", "Accepted baseline and qualifications")
        ]
      },
      {
        id: "preview-source-register",
        key: "previewSourceRegister",
        title: "Connected Source Records",
        documentNumber: childNumber("introduction.references", 1),
        repeatable: {
          dataKey: "sourceReferences",
          itemLabel: "Source document",
          displayId: { prefix: "SRS-REF-", padding: 3 },
          previewStyle: "list",
          primaryField: "sourceTitle",
          fields: [
            field("sourceTitle", "Source document", "text"),
            field("sourceVersion", "Version", "text"),
            field("baselineUse", "Use in this SRS", "textarea"),
            field("reviewStatus", "Review status", "text")
          ]
        }
      },
      {
        id: "preview-evidence-issues",
        key: "previewEvidenceIssues",
        title: "Evidence Gaps and Conflicts",
        documentNumber: childNumber("introduction.references", 2),
        repeatable: {
          dataKey: "evidenceIssues",
          itemLabel: "Baseline issue",
          displayId: { prefix: "SRS-ISS-", padding: 3 },
          previewStyle: "list",
          primaryField: "description",
          fields: [
            field("description", "Gap or conflict"),
            field("sourceTitle", "Source document", "text"),
            field("issueType", "Issue type", "text"),
            field("status", "Status", "text"),
            field("affectedDecision", "SRS decision affected"),
            field("resolution", "Confirmed resolution or next evidence needed"),
            field("owner", "Resolution owner", "text"),
            field("sourceReferences", "Source record IDs or precise locators", "text"),
            ...issueFollowUpFields
          ]
        }
      },
      {
        id: "preview-prior-analysis",
        key: "previewPriorAnalysis",
        title: "Appendices and Prior Analysis",
        documentNumber: outlineNumber("supporting-information.appendices"),
        numberFields: false,
        fields: [field("priorAnalysisDisposition", "Prior analysis disposition")]
      }
    ])
  };
}

function buildSpecificationFrame(stage: SchemaNode, localData: DataModel, documentModel: DocumentModel, documentSchemas: readonly SchemaNode[]): BaselinePreviewModel {
  const client = sourceData(documentModel, documentSchemas, "client-requirements").data;
  const request = sourceData(documentModel, documentSchemas, "system-request").data;
  const feasibility = sourceData(documentModel, documentSchemas, "feasibility-stakeholder-analysis").data;
  const records = rootRecords(documentModel);
  const audienceFields = stageSection(stage, "intended-audiences")?.repeatable?.fields || [];
  const data = {
    ...localData,
    audiences: populatedRecords(records.audiences, audienceFields),
    perspectiveEvidence: evidenceLines([
      ["Client discovery — problem and current situation", client.businessProblem],
      ["Client discovery — desired outcome", client.desiredOutcome],
      ["Feasibility recommendation", feasibility.overallRecommendation],
      ["Organizational context", feasibility.organizationalConclusion]
    ])
  };

  return {
    data,
    page: previewPage(stage, [
      {
        id: "preview-purpose-audience",
        key: "previewPurposeAudience",
        title: "Purpose and Audience",
        documentNumber: outlineNumber("introduction.purpose-audience"),
        numberFields: false,
        fields: [field("purposeStatement", "Purpose")]
      },
      {
        id: "preview-intended-audiences",
        key: "previewIntendedAudiences",
        title: "Intended Audiences",
        documentNumber: childNumber("introduction.purpose-audience", 1),
        repeatable: {
          dataKey: "audiences",
          itemLabel: "Audience",
          displayId: { prefix: "SRS-AUD-", padding: 3 },
          previewStyle: "list",
          primaryField: "nameOrGroup",
          fields: [
            field("nameOrGroup", "Person or audience group", "text"),
            field("relationshipToProduct", "Relationship to the product", "text"),
            field("usesSpecificationFor", "How this audience uses the SRS"),
            field("reviewAuthority", "Review role", "text"),
            field("sourceReferences", "Supporting source IDs", "text")
          ]
        }
      },
      {
        id: "preview-product-perspective",
        key: "previewProductPerspective",
        title: "Product Perspective",
        documentNumber: outlineNumber("overall-description.product-perspective"),
        numberFields: false,
        fields: [
          field("perspectiveEvidence", "Evidence carried forward"),
          field("productPerspectiveStatus", "Baseline review", "text"),
          field("productPerspectiveClarification", "Clarification or correction")
        ]
      }
    ])
  };
}

function buildScopeBaseline(stage: SchemaNode, localData: DataModel, documentModel: DocumentModel, documentSchemas: readonly SchemaNode[]): BaselinePreviewModel {
  const client = sourceData(documentModel, documentSchemas, "client-requirements").data;
  const requestSource = sourceData(documentModel, documentSchemas, "system-request");
  const request = requestSource.data;
  const feasibility = sourceData(documentModel, documentSchemas, "feasibility-stakeholder-analysis").data;
  const records = rootRecords(documentModel);
  const decisionSection = stageSection(stage, "scope-decisions");
  const decisions = populatedRecords(records.scopeDecisions, decisionSection?.repeatable?.fields || []);
  const featureSection = schemaSection(requestSource.schema, "business-requirements");
  const featureRecords = populatedRecords(request.requirements, featureSection?.repeatable?.fields || []);
  const productFeatures = featureRecords.map((feature, index) => {
    const recordId = formatRecordDisplayId(featureSection?.repeatable?.displayId, feature, index);
    const decision = latestFeatureDecision(decisions, recordId);
    const decisionIndex = decision ? decisions.indexOf(decision) : -1;
    const decisionId = decision
      ? formatRecordDisplayId(decisionSection?.repeatable?.displayId, decision, decisionIndex)
      : "";

    if (["Exclude", "Defer"].includes(String(decision?.decisionType || ""))) {
      return null;
    }

    return {
      ...feature,
      baselineDisposition: carriedFeatureDisposition(localData.scopeDisposition, decision, decisionId)
    };
  }).filter(Boolean);
  const data = {
    ...localData,
    sourceInScope: client.inScope,
    confirmedInclusions: decisionStatements(decisions, "Include"),
    sourceOutOfScope: client.outOfScope,
    confirmedExclusions: decisionStatements(decisions, "Exclude"),
    deferredItems: decisionStatements(decisions, "Defer"),
    sourceConstraints: client.constraints,
    confirmedConstraints: decisionStatements(decisions, "Constraint"),
    sourceAssumptions: client.assumptions,
    confirmedAssumptions: decisionStatements(decisions, "Assumption"),
    feasibilityConditions: feasibility.conditionsToProceed,
    productFeatures,
    scopeDecisions: decisions
  };

  return {
    data,
    page: previewPage(stage, [
      {
        id: "preview-project-scope",
        key: "previewProjectScope",
        title: "Project Scope",
        documentNumber: outlineNumber("introduction.scope"),
        numberFields: false,
        fields: [
          field("sourceInScope", "Source in-scope boundary"),
          field("confirmedInclusions", "Confirmed additions or inclusions"),
          field("sourceOutOfScope", "Source out-of-scope boundary"),
          field("confirmedExclusions", "Confirmed exclusions"),
          field("deferredItems", "Deferred from this baseline"),
          field("sourceConstraints", "Source constraints"),
          field("confirmedConstraints", "Confirmed constraint decisions"),
          field("sourceAssumptions", "Source assumptions and dependencies"),
          field("confirmedAssumptions", "Confirmed assumption decisions"),
          field("feasibilityConditions", "Feasibility conditions affecting scope"),
          field("scopeDisposition", "Boundary review", "text"),
          field("scopeReconciliation", "Boundary clarification or reconciliation"),
          field("capabilityAlignment", "Needs-to-capabilities coverage", "text"),
          field("capabilityAlignmentNotes", "Coverage gaps or conflicts")
        ]
      },
      {
        id: "preview-scope-decisions",
        key: "previewScopeDecisions",
        title: "Scope Decisions",
        documentNumber: childNumber("introduction.scope", 1),
        repeatable: {
          dataKey: "scopeDecisions",
          itemLabel: "Scope decision",
          displayId: decisionSection?.repeatable?.displayId || { prefix: "SRS-SCP-", padding: 3 },
          previewStyle: "list",
          primaryField: "statement",
          fields: [
            field("statement", "Scope statement"),
            field("decisionType", "Disposition", "text"),
            field("status", "Decision status", "text"),
            field("owner", "Decision authority", "text"),
            field("rationale", "Rationale"),
            field("sourceReferences", "Source record IDs", "text")
          ]
        }
      },
      {
        id: "preview-product-features",
        key: "previewProductFeatures",
        title: "Product Features",
        documentNumber: outlineNumber("overall-description.product-features"),
        repeatable: {
          dataKey: "productFeatures",
          itemLabel: "Product feature",
          displayId: featureSection?.repeatable?.displayId || { prefix: "SR-BR-", padding: 3 },
          previewStyle: "list",
          primaryField: "statement",
          fields: [
            field("statement", "Capability statement"),
            field("businessArea", "Business area", "text"),
            field("priority", "Priority", "text"),
            field("baselineDisposition", "Scope baseline disposition", "text"),
            field("source", "Source", "text"),
            field("rationale", "Business rationale")
          ]
        }
      }
    ])
  };
}

function buildVocabularyBaseline(stage: SchemaNode, localData: DataModel, documentModel: DocumentModel): BaselinePreviewModel {
  const records = rootRecords(documentModel);
  const termFields = stageSection(stage, "controlled-terms")?.repeatable?.fields || [];
  const data = {
    ...localData,
    terms: populatedRecords(records.terms, termFields)
  };

  return {
    data,
    page: previewPage(stage, [
      {
        id: "preview-terms",
        key: "previewTerms",
        title: "Terms and Definitions",
        documentNumber: outlineNumber("introduction.terms"),
        repeatable: {
          dataKey: "terms",
          itemLabel: "Term",
          displayId: { prefix: "SRS-TERM-", padding: 3 },
          previewStyle: "list",
          primaryField: "term",
          fields: [
            field("term", "Preferred term or acronym", "text"),
            field("definition", "Project-specific definition"),
            field("status", "Status", "text"),
            field("usageNotes", "Usage notes"),
            field("sourceReferences", "Source record IDs", "text")
          ]
        }
      },
      {
        id: "preview-vocabulary-review",
        key: "previewVocabularyReview",
        title: "Vocabulary Review",
        documentNumber: childNumber("introduction.terms", 1),
        numberFields: false,
        fields: [
          field("vocabularyStatus", "Vocabulary readiness", "text"),
          field("vocabularyNotes", "Pending terms or terminology conflicts")
        ]
      }
    ])
  };
}

const builders: Record<string, BaselineBuilder> = {
  "srs-baseline-evidence-intake": buildEvidenceIntake,
  "srs-baseline-specification-frame": buildSpecificationFrame,
  "srs-baseline-scope": buildScopeBaseline,
  "srs-baseline-vocabulary": buildVocabularyBaseline
};

export function baselinePreviewModel(stage: SchemaNode, localData: DataModel, documentModel: DocumentModel, documentSchemas: readonly SchemaNode[]): BaselinePreviewModel {
  const builder = builders[stage.id];
  return builder
    ? simplifyBaselinePreview(builder(stage, localData, documentModel, documentSchemas))
    : { data: localData, page: previewPage(stage, stage.sections || []) };
}
