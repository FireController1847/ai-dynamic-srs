import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
// All requirement kinds use the same answer and verification contract.
// Keep this declarative and independent of any phase's schema builders.
const text = (key: string, label: string, extra: Partial<Field> = {}): Field => ({ key, label, type: "textarea", default: "", rows: 3, ...extra });
const choice = (key: string, label: string, options: FieldOption[], extra: Partial<Field> = {}): Field => ({ key, label, type: "select", default: "", placeholder: "Select an option", options, columns: "col-md-6", ...extra });

export function requirementFields(specializedFields: Field[] = [], { functional = false }: { functional?: boolean } = {}): Field[] {
  return [
    text("statement", "Requirement statement", { placeholder: "The system shall… State one supported, observable obligation and its relevant condition." }),
    ...specializedFields,
    text("useCaseReferences", functional ? "Source use cases (IDs)" : "Affected use-case IDs", { type: "text", referenceFormat: "ids", placeholder: "Exact use-case IDs, comma-separated; explain system-wide applicability in the rationale" }),
    ...(functional ? [text("flowReferences", "Source steps or paths", { type: "text", referenceFormat: "paths", placeholder: "Existing use-case ID + recorded step/path; e.g. SRS-UC-001 normal step 3" })] : []),
    text("sourceReferences", "Supporting source IDs", { type: "text", referenceFormat: "source-locators", placeholder: "Exact source IDs or supplied document/section/date locators" }),
    text("rationale", "Why it is needed and where it applies"),
    text("acceptanceCriterion", "Observable acceptance criterion", { placeholder: "Under what conditions, measured how, and with what observable passing result? Leave unagreed targets as questions." }),
    choice("verificationMethod", "Verification method", ["Test", "Demonstration", "Inspection", "Analysis"]),
    choice("priority", "Priority", ["Must", "Should", "Could"]),
    choice("status", "Requirement status", ["Draft", "Reviewed", "Deferred", "Rejected"], { default: "Draft" }),
    text("openQuestions", "Unresolved questions / related issue IDs", { placeholder: "Leave blank when none remain; otherwise cite the SRS-ISS record that owns the answer and next action." })
  ];
}
