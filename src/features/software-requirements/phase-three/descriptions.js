import { stage, reviewSection, caseView, text, choice } from "./shared.js";
import { catalogEvidence, casualSource, mapSource, activitySource } from "./evidence.js";

export const casualDescriptionsStage = stage(
  "srs-behavior-casual-descriptions", "casualDescriptions", "Casual Descriptions",
  "Give each active use case a short success story and behavioral contract before modeling the details.",
  ["functional-behavior.use-case-descriptions"], catalogEvidence,
  [
    reviewSection("casual-review", "Use-Case Description Review", "functional-behavior.use-case-descriptions", "Check that the short stories cover the catalog without silently changing its boundary."),
    caseView("casual-stories", "Casual Descriptions", 1, [
      text("preconditions", "Preconditions", { placeholder: "What must already be true before the trigger?" }),
      text("successGuarantee", "Successful outcome / postconditions"),
      text("casualStory", "Main success story", { rows: 5, placeholder: "A short paragraph or numbered outline: actor intention, system response, and meaningful result." }),
      text("failureGuarantee", "Minimum guarantee when the goal is not achieved"),
      text("casualQuestions", "Exceptions, ambiguities, or questions for modeling", { placeholder: "Leave blank when none remain. Otherwise cite SRS-ISS IDs; preserve confirmed answers in the story and issue resolution." }),
      choice("casualStatus", "Story review", ["Draft", "Reviewed with questions", "Reviewed"])
    ])
  ],
  "Write concise essential behavior, as in the Sunland casual descriptions. Carry identity, actors, goals, and triggers from the catalog. Describe success and the main interactions without screens, detailed branches, or invented policy. Raise new exceptions as questions for the diagrams and detailed descriptions.",
  [
    { title: "Read the carried context", text: "Identity and participants come from the catalog. Correct them there once if the story exposes a mismatch." },
    { title: "Tell the success story", text: "Explain what the actor requests, what the system does, and what has changed when the goal succeeds." },
    { title: "Expose open paths", text: "Record likely exceptions and ambiguities for the next modeling step; keep unconfirmed rules provisional." }
  ]
);

export const detailedDescriptionsStage = stage(
  "srs-behavior-detailed-descriptions", "detailedDescriptions", "Detailed Descriptions",
  "Refine selected use cases with event flows and alternatives revealed by the activity workflows.",
  ["functional-behavior.use-case-descriptions"], [...catalogEvidence, casualSource, mapSource, activitySource],
  [
    reviewSection("detail-review", "Detailed Behavior Review", "functional-behavior.use-case-descriptions", "Reconcile the stories, participants, figures, and explicit event paths."),
    caseView("detailed-stories", "Detailed Descriptions", 2, [
      text("preconditions", "Preconditions"),
      text("successGuarantee", "Successful outcome / postconditions"),
      text("failureGuarantee", "Minimum guarantee on failure"),
      text("casualStory", "Carried success story", { editable: false, completion: false }),
      text("casualQuestions", "Questions carried from the casual story", { editable: false, completion: false }),
      choice("detailLevel", "Detail needed", ["Overview sufficient", "Detailed description needed", "Not yet decided"]),
      text("detailReason", "Reason for the chosen detail level"),
      choice("descriptionStyle", "Description style", ["Essential (technology independent)", "Real (supported concrete scenario)"]),
      text("normalFlow", "Normal flow of events", { rows: 7, placeholder: "Number each step. Name who acts and who receives the action. Keep actor and system responses clear." }),
      text("subflows", "Named subflows", { rows: 4, placeholder: "S-1 …; identify where each subflow starts and returns." }),
      text("alternativeFlows", "Alternative and exceptional flows", { rows: 6, placeholder: "AF-1 / EF-1: originating step, condition, response, and return or termination. State none identified only after review." }),
      text("figureReferences", "Supporting figure IDs", { type: "text", placeholder: "FIG-0001, FIG-0002" }),
      text("specialConditions", "Business rules or special conditions and sources"),
      text("detailQuestions", "Remaining questions or model discrepancies", { placeholder: "Resolve carried questions in the shared use case, or cite an SRS-ISS issue with an owner and next action. Leave blank when none remain." }),
      text("workflowEvidenceNotes", "Workflow evidence or reason no activity figure is needed", { placeholder: "Cite a supporting activity FIG ID above, or explain why a walkthrough is sufficient and where its results are recorded." }),
      choice("detailStatus", "Detailed description review", ["Draft", "Reviewed with questions", "Reviewed", "Overview sufficient"])
    ])
  ],
  "Follow Chapter 4's subject–verb–object steps and the Sunland detailed-use-case structure. Normal, subflow, alternate, and exceptional paths must identify initiators, conditions, and return/end points. Reuse the existing preconditions and guarantees. Overview-only cases may retain empty flows with a documented reason. Cite figure IDs but do not pretend to read diagram bytes from clipboard context.",
  [
    { title: "Choose the necessary precision", text: "Prioritize complex or risky cases. Record why an overview is sufficient where full flows add little value." },
    { title: "Walk every path", text: "Number the normal steps; identify where each alternative branches, resumes, or ends. Keep each action at a comparable level of detail." },
    { title: "Reconcile representations", text: "Compare the activity diagram and story. Correct both when one reveals missing behavior, then derive atomic requirements." }
  ]
);
