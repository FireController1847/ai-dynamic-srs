import { promptGuidance } from "../workflow/prompt-guidance.ts";
import { actorSources } from "./evidence.ts";
import { actorReference } from "./record-references.ts";

export const actorsGoalsStage = {
  id: "srs-discovery-actors-goals", stateKey: "actorsAndGoals", label: "Actors & Goals",
  description: "Identify external roles and the outcomes they need from the agreed system boundary. A stakeholder becomes an actor only through interaction.",
  documentTargets: ["functional-behavior.actors-goals"],
  formComponent: "actors-goals-form", previewComponent: "placed-stage-preview",
  form: { kicker: "Phase 2 · Discover actors and goals", intro: "Describe each actor and add its goals directly beneath it. The form links them automatically; processes come next." },
  evidence: { title: "Carry the boundary and viewpoints into actor discovery", summary: "Review Phase 1 decisions and stakeholder perspectives. Keep role names consistent with the vocabulary.", sources: actorSources },
  guide: {
    title: "Identify roles, then their goals",
    summary: "Actors exchange information with the system from outside its boundary. Goals describe outcomes the system helps them achieve.",
    steps: [
      { title: "State the subject boundary", text: "Name what is being specified. Internal modules and databases are not actors; another independently operated system may be." },
      { title: "Identify interacting roles", text: "Use roles such as Customer or IT Staff, as in the Sunland example. One person may play several roles, and many people may play one role." },
      { title: "Describe actor goals", text: "Ask what success looks like to that role. Book a cruise is a goal; click a button describes an interface action. Cite the need or scope decision supporting the outcome." },
      { title: "Check for missing or unsupported roles", text: "Review interacting stakeholder perspectives, external services, and goal coverage. Send new scope questions back to Phase 1 before treating them as agreed behavior." }
    ],
    terms: [
      { term: "Actor", definition: "An external human role, organization, device, or system that exchanges information with the subject system." },
      { term: "Goal", definition: "A result an actor seeks, stated independently of screens or implementation." },
      { term: "Primary and supporting actors", definition: "For a particular use case, the primary actor seeks its outcome; supporting actors supply services or information. A role may participate differently in another use case." }
    ]
  },
  ai: {
    orientation: {
      requiredDefinitions: ["Actor", "Goal"],
      what: "An actor is a role outside the system that interacts with it, such as a customer or an external service; it is not a particular named person. A goal is the useful result that role needs. We identify these so later use cases describe the right work for the right participants.",
      focus: "Reuse the agreed boundary. For uncertain roles, ask what each can do or needs to achieve that the others cannot. Then recommend whether separate actors are useful, with a short reason. Do not open by asking the client to choose between abstract actor classifications. Explain the stakeholder/actor distinction only when relevant.",
      example: "In a hypothetical booking system, Customer is an actor and Obtain a confirmed reservation is a goal. Clicking a button is a step toward that result. The system's own database is an internal component, not an external actor. Use this only as an illustration, not as a fact about the client's project."
    },
    ...promptGuidance["srs-discovery-actors-goals"]
  },
  sections: [
    {
      id: "actor-boundary", key: "actorBoundary", title: "Confirm the interaction boundary",
      previewTitle: "Actors and Goals", documentTarget: "functional-behavior.actors-goals",
      description: "Give the subject a short name and distinguish its responsibilities from the external roles around it.",
      help: { what: "The subject boundary used to decide whether a proposed role is an actor.", why: "Actor classification changes when the system boundary changes.", expectation: "Name the subject, briefly explain its boundary using Phase 1 references, and record unresolved role or goal questions." },
      fields: [
        { key: "subjectName", label: "Subject system or product", type: "text", default: "", columns: "col-md-6", completion: true },
        { key: "actorReviewStatus", label: "Actor and goal review", type: "select", default: "", columns: "col-md-6", placeholder: "Select review result", options: ["Reviewed", "Reviewed with open questions", "Needs boundary clarification"], completion: true },
        { key: "boundaryInterpretation", label: "Interaction boundary and Phase 1 references", type: "textarea", default: "", rows: 3, completion: true, placeholder: "Briefly identify what is inside the subject and what interacts from outside. Cite the existing scope; do not rewrite it." },
        { key: "actorReviewNotes", label: "Missing roles, unsupported goals, or boundary questions", type: "textarea", default: "", rows: 3, showWhen: { key: "actorReviewStatus", in: ["Reviewed with open questions", "Needs boundary clarification"] }, completion: true }
      ]
    },
    {
      id: "actor-catalog", key: "actorCatalog", title: "External actors",
      documentTarget: "functional-behavior.actors-goals", documentSubsection: 1,
      description: "One record per role. Keep IDs when a role is renamed or refined.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: { what: "The canonical actor catalog reused by later use cases and models.", why: "A stable role identity avoids conflicting actor lists across diagrams and descriptions.", expectation: "Describe the role, its interaction across the boundary, and its supporting perspective or source. Keep uncertain roles provisional." },
      repeatable: {
        dataKey: "actors", itemLabel: "Actor", addLabel: "Add actor", minimum: 1, stableIds: true,
        displayId: { prefix: "SRS-ACT-", padding: 3 }, primaryField: "name", previewStyle: "list", completionFields: ["name", "interaction", "perspectiveReferences"],
        fields: [
          { key: "name", label: "Actor role", type: "text", default: "", columns: "col-md-6", placeholder: "Customer, IT Staff, external payment service…" },
          { key: "kind", label: "Actor kind", type: "select", default: "", columns: "col-md-6", placeholder: "Select kind", options: ["Human role", "External system", "External organization", "External device"] },
          { key: "interaction", label: "Information or services exchanged", type: "textarea", default: "", rows: 3, placeholder: "What crosses the subject boundary, and why is this role external?" },
          { key: "participation", label: "Expected participation", type: "select", default: "", columns: "col-md-6", placeholder: "Select participation", options: ["Seeks an outcome", "Provides a supporting service", "Both"] },
          { key: "status", label: "Actor status", type: "select", default: "Candidate", columns: "col-md-6", options: ["Candidate", "Confirmed", "Needs clarification", "Not an actor"] },
          { key: "perspectiveReferences", label: "Perspective IDs", type: "text", default: "", columns: "col-md-6", placeholder: "SRS-VPT-001; leave empty for a separately evidenced external service." },
          { key: "sourceReferences", label: "Other supporting source IDs", type: "text", default: "", columns: "col-md-6", placeholder: "SRS-SCP-001, SR-BR-002…" },
          { key: "notes", label: "Role distinctions or unresolved questions", type: "textarea", default: "", rows: 2 }
        ]
      }
    },
    {
      id: "goal-catalog", key: "goalCatalog", title: "Actor goals",
      documentTarget: "functional-behavior.actors-goals", documentSubsection: 2,
      description: "Add outcomes beneath the actor who needs them; the form manages the link.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: { what: "The canonical goals used to discover major processes.", why: "Goals connect prior business needs to behavior without prematurely writing detailed requirements.", expectation: "For each actor, state its outcomes, cite evidence, describe observable success, and flag any scope decision still needed. The actor link is automatic." },
      repeatable: {
        dataKey: "goals", itemLabel: "Goal", addLabel: "Add goal", minimum: 0, completionMinimum: 1, stableIds: true,
        displayId: { prefix: "SRS-GOL-", padding: 3 }, primaryField: "outcome", previewStyle: "list", completionFields: ["outcome", "actorId", "sourceReferences"],
        fields: [
          { key: "outcome", label: "Desired outcome", type: "textarea", default: "", rows: 2, placeholder: "Verb–noun outcome, such as Book a cruise." },
          { key: "actorId", label: "Linked actor (assigned by form)", editable: false, completion: false, type: "select", options: [], reference: actorReference, default: "", columns: "col-md-5", aiHint: "Read-only relationship context. Group goals beneath their actor in your answer; the form assigns the link. Do not return this field or ask the user to enter it." },
          { key: "sourceReferences", label: "Supporting need, perspective, or scope IDs", type: "text", default: "", columns: "col-md-7", placeholder: "SR-BR-001, SRS-VPT-001, SRS-SCP-002…" },
          { key: "successEvidence", label: "How the actor recognizes success", type: "textarea", default: "", rows: 2, placeholder: "An observable result, without prescribing screens or implementation." },
          { key: "scopeStatus", label: "Relationship to the scope baseline", type: "select", default: "Proposed", columns: "col-md-5", options: ["Proposed", "Supported by baseline", "Needs scope decision", "Deferred", "Excluded"] },
          { key: "notes", label: "Qualifications or unresolved questions", type: "textarea", default: "", rows: 2, columns: "col-md-7" }
        ]
      }
    }
  ]
};
