import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
import { scopeBaselineStage } from "../phase-one/scope-baseline.ts";
import { evidenceIntakeStage } from "../phase-one/evidence-intake.ts";
import { stage, text, choice, internal, review } from "./shared.ts";
import { baselineSources, operatingSource, attributesSource, interfacesSource } from "./evidence.ts";

const decisions = scopeBaselineStage.sections.find(({ id }) => id === "scope-decisions");
function decisionView(id: string, title: string, type: string, target: string, extraFields: Field[]): Section {
  return {
    ...decisions, id, key: id, title, documentTarget: target, documentSubsection: 1,
    description: `Refine the existing ${type.toLowerCase()} records from Scope Baseline in place. Add only genuinely new decisions; existing IDs and source wording are retained.`,
    repeatable: {
      ...decisions.repeatable, itemLabel: type, addLabel: `Add ${type.toLowerCase()}`,
      recordFilter: { key: "decisionType", equals: type },
      fields: [
        internal("decisionType", type),
        ...decisions.repeatable.fields.filter(({ key }) => key !== "decisionType"),
        ...extraFields
      ]
    }
  };
}

export const operatingContextStage = stage(
  "srs-quality-operating-context", "operatingContext", "Operating Context",
  "Start with the established boundary and behavior. Specify only the operating conditions and binding limits that are still missing.",
  ["overall-description.operating-environment", "overall-description.constraints"], baselineSources,
  [
    {
      id: "operating-environment", key: "operatingEnvironment", title: "Operating Environment", documentTarget: "overall-description.operating-environment",
      description: "Describe how, where, and under what conditions the accepted use cases run. Cite prior decisions instead of restating the project scope.",
      fields: [
        text("usageConditions", "Locations and conditions of use", { completion: true, placeholder: "Where is it used? By which existing roles? What working hours, physical conditions, or connectivity matter?" }),
        text("platformConditions", "Established platform and infrastructure conditions", { completion: true, placeholder: "Supported devices/environments and existing systems, only where evidenced. Distinguish known conditions from unmade design choices." }),
        text("operationalResponsibilities", "Operational responsibilities and support", { placeholder: "Who operates, supports, or maintains it? Reference existing actor or perspective IDs." }),
        text("environmentSources", "Source IDs and qualifications", { completion: true, placeholder: "Cite prior evidence and use cases; identify unknown operating conditions." })
      ]
    },
    review("constraints-review", "Constraint Review", "overall-description.constraints", "Which limits are mandatory, who imposes them, and which are merely assumptions or design preferences?", ["In progress", "Constraints reconciled", "No binding constraints identified", "Needs clarification"]),
    decisionView("operating-constraints", "Binding Constraints", "Constraint", "overall-description.constraints", [
      text("affectedReferences", "Affected use-case or requirement IDs", { type: "text" }),
      text("complianceEvidence", "How compliance will be demonstrated", { placeholder: "State the observable evidence or review needed, including the authority/source for any mandated standard." })
    ])
  ],
  "Describe the operating environment from supported use cases and feasibility evidence. Refine canonical Constraint decisions in place. Do not turn a preferred implementation into a mandated constraint, or repeat the entire scope.",
  [
    { title: "Locate the behavior", text: "Read the actors, use cases, client conditions, and feasibility findings. Identify where and under what conditions each relevant interaction occurs." },
    { title: "Separate limits from choices", text: "Carry binding constraints forward under their existing IDs. Cite the authority; leave unconfirmed choices proposed." },
    { title: "Challenge earlier work", text: "If a use case cannot operate within these limits, record the conflict and return to its source rather than silently expanding scope." }
  ]
);

const issues = evidenceIntakeStage.sections.find(({ id }) => id === "baseline-exceptions");
export const assumptionsStage = stage(
  "srs-quality-assumptions", "assumptionsAndDependencies", "Assumptions & Dependencies",
  "Check what the specification still relies on being true. Refine earlier assumptions and connect each uncertainty to the behavior or requirement it could invalidate.",
  ["overall-description.assumptions", "supporting-information.appendices"], [...baselineSources, operatingSource, attributesSource, interfacesSource],
  [
    review("assumptions-review", "Assumption and Dependency Review", "overall-description.assumptions", "What external conditions, services, decisions, or deliveries must hold? What changes if they do not?", ["In progress", "Reviewed with outstanding conditions", "No outstanding conditions", "Needs reconciliation"]),
    decisionView("assumptions", "Assumptions and External Dependencies", "Assumption", "overall-description.assumptions", [
      choice("dependencyKind", "Condition type", ["Assumption", "External dependency"]),
      text("dependencyProvider", "Responsible party or external provider", { type: "text" }),
      text("affectedReferences", "Affected use-case / requirement / figure IDs", { type: "text" }),
      text("validationPlan", "How and when this will be checked", { placeholder: "Evidence needed, responsible person, and deadline or triggering event." }),
      choice("validationStatus", "Validation state", ["Unverified", "Being checked", "Validated", "Invalidated"], { default: "Unverified" }),
      text("validationEvidence", "Validation evidence and date"),
      text("failureImpact", "Impact and response if the condition fails", { placeholder: "Which obligations become infeasible or need revision? Cite the shared issue when a decision is needed." })
    ]),
    { ...issues, id: "quality-issues", key: "qualityIssues", title: "Shared Gaps and Conflicts", documentTarget: "supporting-information.appendices", documentSubsection: 1, description: "The existing SRS-ISS register, not another issue list. Record unresolved quality, boundary, and dependency conflicts with their affected IDs and next decision." }
  ],
  "Revisit the same SRS-SCP Assumption records, including external dependencies as a condition type. Decision confirmation is not factual validation. Require evidence before marking a condition validated. Link affected requirements and describe failure impact; do not silently revise their status or erase invalidated assumptions.",
  [
    { title: "Expose reliance", text: "Inspect the operating conditions, qualities, and external interfaces for facts that still depend on another party or an unverified belief." },
    { title: "Reuse and qualify", text: "Update existing SRS-SCP assumptions, name dependencies and owners, and record validation evidence separately from decision approval." },
    { title: "Close the loop", text: "For failed or uncertain conditions, identify affected requirements and record the resolution or next action in the shared issue register." }
  ]
);
