import { stage, text, review, requirementSection, actorReference } from "./shared.js";
import { link } from "../phase-three/shared.js";
import { baselineSources, operatingSource, attributesSource } from "./evidence.js";

const groups = [
  {
    id: "user", title: "User Interfaces", question: "What must people be able to understand, enter, navigate, and receive at the established system boundary?",
    fields: [
      text("interactionExpectations", "Navigation, input, and output expectations", { placeholder: "Derive from an existing task/path: required information, feedback, validation and error recovery. Reference cross-cutting usability/accessibility requirements." })
    ]
  },
  {
    id: "hardware", title: "Hardware Interfaces", question: "Which external devices must exchange information or signals with this system, and on what terms?",
    fields: [text("interfaceContract", "Required device / signal contract", { placeholder: "Required device capabilities, signals, units and supported standards where already mandated. Do not invent internal hardware design." })]
  },
  {
    id: "software", title: "Software Interfaces", question: "Which existing external services, applications, or files must this system consume or provide?",
    fields: [text("interfaceContract", "Required service / data contract", { placeholder: "Data exchanged, formats, ownership, required compatibility/version and authoritative specification. Name an API only when established." })]
  },
  {
    id: "communication", title: "Communication Interfaces", question: "What external communication conditions or interoperability rules are required for those exchanges?",
    fields: [text("interfaceContract", "Required communication contract", { placeholder: "Direction, timing/connectivity constraints, supported protocol/format if mandated. Reference software/hardware interface IDs rather than copying their whole contract." })]
  }
];

export const interfaceRequirementsStage = stage(
  "srs-quality-interface-requirements", "interfaceRequirements", "Interface Requirements",
  "Follow the actors and use-case exchanges across the system boundary. Specify their external contracts before drawing screens or choosing internal architecture.",
  groups.map(({ id }) => `external-interfaces.${id}`), [...baselineSources, operatingSource, attributesSource],
  groups.flatMap(({ id, title, question, fields }) => [
    review(`${id}-interface-review`, `${title} Review`, `external-interfaces.${id}`, question),
    {
      ...requirementSection(id, title, `external-interfaces.${id}`, "Interface", [
        link("externalActorId", "External actor", actorReference, { completion: false }),
        text("boundaryName", "Boundary / endpoint or actor qualification", { type: "text", placeholder: "Identify the existing boundary. If no actor fits, record the gap and revisit Actors & Goals." }),
        ...fields,
        text("failureBehavior", "Invalid input, unavailable endpoint, and recovery", { placeholder: "Describe externally visible handling or reference the use-case exception path / functional requirement that defines it." }),
        text("relatedRequirementReferences", "Related quality / interface requirement IDs", { type: "text", placeholder: "SRS-QR-001, SRS-IR-002…" })
      ], { parent: {
        fieldKey: "externalActorId", reference: actorReference, label: "External actor",
        recordFilter: { key: "status", in: ["Candidate", "Confirmed", "Needs clarification"] },
        allowUngrouped: true, unassignedOption: "Boundary without an established actor",
        description: "Add obligations beneath the external actor involved; the link is assigned automatically. A boundary may still be documented before its actor is established.",
        ungroupedTitle: "Boundary requirements without an available actor",
        ungroupedAddLabel: "Add boundary requirement",
        ungroupedDescription: "Describe the boundary below when no actor is established, or assign a saved requirement to an actor by name. Existing links and IDs are preserved until you change them."
      } }),
      description: "One external obligation per record, linked to existing actors and behavior. Multiple requirements may refer to the same endpoint. No interface of this kind? Explain that in the review above."
    }
  ]),
  "Use the template's human, hardware, software and communication interface categories. Follow Chapter 10's use-case-driven navigation/input/output thinking without designing mockups yet. Group obligations beneath existing external actors; the form assigns those links. Keep a qualified boundary record when no actor is established; a newly discovered role must be reconciled in Actors & Goals. Cite shared functional/quality requirements for behavior and cross-cutting rules; specify only the remaining boundary contract. Do not assume a hardware interface or protocol is needed just because its category exists.",
  [
    { title: "Trace each exchange", text: "Start with a use case's primary/supporting actors and identify what crosses the boundary, in which direction, and when." },
    { title: "Specify the contract", text: "Describe required information, interaction or compatibility, and externally visible failure handling. Cite existing requirements instead of duplicating them." },
    { title: "Expose missing dependencies", text: "If a device, provider, protocol, or role is not established, carry that uncertainty to the shared assumptions and issues. UI mockups and further model uploads belong to Phase 5; existing DrawIO figures remain available in Phase 3." }
  ]
);
