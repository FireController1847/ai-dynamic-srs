import { promptGuidance } from "../workflow/prompt-guidance.ts";
import { processSources } from "./evidence.ts";
import { actorReference, primaryActorGrouping } from "./record-references.ts";

export const candidateProcessesStage = {
  id: "srs-discovery-processes", stateKey: "candidateProcesses", label: "Candidate Processes",
  description: "Group actor goals into major processes, check coverage and boundaries, and carry the candidates into use-case elaboration.",
  documentTargets: ["functional-behavior.use-case-model"],
  formComponent: "discovery-stage-form", previewComponent: "placed-stage-preview",
  form: { kicker: "Phase 2 · Discover actors and goals", intro: "Identify the behavior worth elaborating next. These candidates become the same use-case records used in Phase 3." },
  evidence: { title: "Goals, scope, and capabilities behind the processes", summary: "Use the existing actor and goal IDs. Compare candidate outcomes against the requested capabilities and baseline decisions.", sources: processSources },
  guide: {
    title: "Discover major processes before writing flows",
    summary: "Each candidate should deliver a meaningful outcome to an actor within the agreed scope.",
    steps: [
      { title: "Start with actor goals", text: "Look for processes that satisfy the recorded goals. Use verb–noun names such as Book Cruise, as in Sunland. Do not treat every button or field as a use case." },
      { title: "Identify participants and boundaries", text: "Reference the primary actor, supporting actors, goals, trigger, and overall result. Detailed steps and alternate flows come in Phase 3." },
      { title: "Review process size", text: "Chapter 4 recommends a small set of major use cases and grouping larger sets into packages. Use that as a sizing check, not a hard limit or a reason to invent or delete behavior." },
      { title: "Check coverage and return to gaps", text: "Every in-scope goal should have a candidate or an explicit open decision. Merge overlaps, split oversized processes, and take new scope decisions back to Phase 1." }
    ]
  },
  ai: {
    ...promptGuidance["srs-discovery-processes"]
  },
  sections: [
    {
      id: "process-review", key: "processReview", title: "Review the candidate set",
      previewTitle: "Use-Case Model", documentTarget: "functional-behavior.use-case-model",
      description: "Check the set as a whole before describing each use case in detail.",
      help: { what: "The discovery checkpoint for coverage, process size, overlap, and unresolved scope.", why: "A plausible collection of use cases can still miss a goal or elaborate excluded behavior.", expectation: "Record coverage, explain gaps or sizing decisions, and choose whether the candidates are ready for elaboration. Completion percentage measures filled fields, not approval." },
      fields: [
        { key: "processReadiness", label: "Readiness for elaboration", type: "select", default: "", placeholder: "Select readiness", options: ["Ready for elaboration", "Ready with visible questions", "Needs actor, goal, or scope revision"], completion: true, columns: "col-md-6" },
        { key: "goalCoverage", label: "Goal coverage review", type: "select", default: "", placeholder: "Select coverage", options: ["All in-scope goals represented", "Gaps or unsupported processes remain", "Not yet reviewed"], completion: true, columns: "col-md-6" },
        { key: "coverageNotes", label: "Uncovered goals or unsupported processes", type: "textarea", default: "", rows: 3, showWhen: { key: "goalCoverage", in: ["Gaps or unsupported processes remain", "Not yet reviewed"] }, completion: true, placeholder: "Cite SRS-GOL, SRS-UC, source capability, or baseline issue IDs and the decision needed." },
        { key: "sizingNotes", label: "Grouping, overlap, and sizing decisions", type: "textarea", default: "", rows: 3, placeholder: "Explain merges, splits, package boundaries, and which record IDs survive." },
        { key: "handoffNotes", label: "Questions to resolve before or during Phase 3", type: "textarea", default: "", rows: 3, showWhen: { key: "processReadiness", in: ["Ready with visible questions", "Needs actor, goal, or scope revision"] }, completion: true }
      ]
    },
    {
      id: "candidate-use-cases", key: "candidateUseCases", title: "Candidate use cases",
      documentTarget: "functional-behavior.use-case-model", documentSubsection: 1,
      description: "One record per meaningful process; later phases enrich these same records.",
      dataPath: ["softwareRequirementsSpecification", "records"],
      help: { what: "The first version of the canonical use-case catalog.", why: "Stable candidates allow each later description or diagram to refine existing behavior instead of creating another list.", expectation: "Name a process, reference its primary actor and goals, summarize its result, and record the trigger. Keep uncertainty and exclusions explicit." },
      repeatable: {
        dataKey: "useCases", itemLabel: "Candidate use case", addLabel: "Add candidate use case", minimum: 0, completionMinimum: 1, stableIds: true, parent: primaryActorGrouping,
        displayId: { prefix: "SRS-UC-", padding: 3 }, primaryField: "name", previewStyle: "list", completionFields: ["name", "primaryActorId", "goalReferences", "briefDescription"],
        fields: [
          { key: "name", label: "Process / use-case name", type: "text", default: "", columns: "col-md-7", placeholder: "Verb–noun phrase: Book Cruise, Manage Guest Groups…", aiHint: 'Name this actor-goal interaction with a concise verb–noun phrase, not a screen, button or implementation component.' },
          { key: "disposition", label: "Candidate disposition", type: "select", default: "Candidate", columns: "col-md-5", options: ["Candidate", "Ready for elaboration", "Needs clarification", "Deferred", "Excluded"], aiHint: 'Use the established scope and clarification state for this case; the default Candidate is not approval. Preserve a known exclusion or deferral.' },
          { key: "primaryActorId", label: "Primary actor", completion: false, type: "select", options: [], reference: actorReference, default: "", columns: "col-md-6", aiHint: "The form assigns this link when a use case is added beneath an actor. Group proposed use cases by actor and omit this field from answers. A temporal trigger is not itself an actor." },
          { key: "supportingActorReferences", label: "Supporting actor IDs", type: "text", default: "", columns: "col-md-6", placeholder: "SRS-ACT-002, SRS-ACT-003; leave empty when none apply.", aiHint: 'Return the exact IDs of established actors supplying services or information to this case. Leave blank when none participate.' },
          { key: "goalReferences", label: "Goals served (IDs)", type: "text", default: "", columns: "col-md-6", placeholder: "SRS-GOL-001, SRS-GOL-002", aiHint: 'Return the exact existing goal IDs satisfied by this interaction. Do not invent goals or replace references with a rationale paragraph.' },
          { key: "sourceReferences", label: "Supporting capability or scope IDs", type: "text", default: "", columns: "col-md-6", placeholder: "SR-BR-001, SRS-SCP-002…" },
          { key: "briefDescription", label: "Process purpose and expected result", type: "textarea", default: "", rows: 3, placeholder: "One or two sentences describing what the process accomplishes for its actor.", aiHint: 'Give a short connected paragraph explaining the actor intention, essential system interaction and meaningful successful result. Detailed flows are authored later.' },
          { key: "trigger", label: "Initiating event", type: "text", default: "", placeholder: "An actor request or a time/event condition, without prescribing a screen." },
          { key: "packageName", label: "Business area or package (optional)", type: "text", default: "", columns: "col-md-5" },
          { key: "reviewNotes", label: "Boundary, overlap, or unresolved questions", type: "textarea", default: "", rows: 2, columns: "col-md-7" }
        ]
      }
    }
  ]
};
