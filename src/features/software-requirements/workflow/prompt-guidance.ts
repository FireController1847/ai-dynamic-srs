import type { AiGuidance } from '../../../core/schema/schema-types.ts';

// Domain guidance only. The core interview and formatter own the shared conversation/output contracts.
type StagePromptGuidance = Pick<AiGuidance, 'interviewGuidance' | 'draftingGuidance'>;

export const promptGuidance: Record<string, StagePromptGuidance> = {
  'srs-baseline-evidence-intake': {
    interviewGuidance: 'Review the project facts available in conversation or memory and every current shared question. Identify gaps or contradictions that would change the specification. Clarify the affected source or decision and any confirmed answer. No evidence cutoff, acceptance essay or routine readiness declaration is required.',
    draftingGuidance: 'Format the requested shared questions, affected record references, status and resolution from established facts. Keep unanswered questions explicit; record a resolution or accepted exception only when its answer or acceptance is confirmed. Do not write a baseline acceptance essay.'
  },
  'srs-baseline-specification-frame': {
    interviewGuidance: 'Establish the product or release this specification describes, the agreement or work it supports, each intended reader and any necessary refinement of the carried product context. Reuse settled project identity and purpose.',
    draftingGuidance: 'Write a brief specification purpose, the requested audience records and necessary product-context refinement. An audience is a reader of the specification, not automatically a stakeholder or actor. Use only established product, release and environment facts.'
  },
  'srs-baseline-scope': {
    interviewGuidance: 'Compare the established boundary and capabilities with each current scope decision. Clarify actual additions, exclusions, deferrals, constraints or dependencies and their disposition; keep the original client boundary as the starting point.',
    draftingGuidance: 'Format material scope-decision records using the agreed decision type, statement, status and supported links. Reuse the carried inclusions and exclusions; do not duplicate the original business case or turn a benefit or concern into a capability.'
  },
  'srs-baseline-vocabulary': {
    interviewGuidance: 'Review every current term and the project language already available. Clarify missing definitions or conflicting meanings that affect the specification, and identify additional terms readers actually need.',
    draftingGuidance: 'Provide each requested term with a concise definition in this project and usage notes only when useful. Use established language from the conversation and supplied evidence; preserve distinctions instead of inventing entities, acronyms or policies.'
  },
  'srs-discovery-perspectives': {
    interviewGuidance: 'Work through every current user class and known stakeholder group. Establish the characteristics that change how people use the system, such as experience, frequency or supported accessibility needs; clarify missing groups without inventing people.',
    draftingGuidance: 'Format every requested user-class name and its relevant usage characteristics. Reuse established stakeholder names. A sponsor or specification reader does not automatically become a user class or actor.'
  },
  'srs-discovery-actors-goals': {
    interviewGuidance: 'Confirm the subject boundary, then cover every interacting role and all its goals, actor by actor. Clarify missing role distinctions and useful outcomes before moving to the next actor. Check for uncovered roles and goals after the existing inventory. Flows, screens and detailed requirements belong later.',
    draftingGuidance: 'Format the requested actor records and their complete goal records beneath the correct actor, including supported optional role clarification. Use existing actor and goal IDs for identification; the form assigns each goal actor link. Primary and supporting participation is specific to a use case.'
  },
  'srs-discovery-processes': {
    interviewGuidance: 'Cover every current use case and every relevant actor goal, not just a sample or a short list. For each case, establish its name, primary actor, goals served, supporting participants and disposition. Identify behavior through its name and goal links; author short behavioral descriptions in 03.1 Casual Descriptions. Clarify missing links or overlap and identify supported additions. Review every existing directed relationship and add include, extend or specialize links only when their semantics are justified. Detailed triggers and flows belong in Detailed Descriptions.',
    draftingGuidance: 'Produce the complete requested use-case records, grouped under their primary actor, using verb–noun names, agreed disposition, supporting actors and goals served. Do not request or return a short behavioral description here; briefDescription is authored in 03.1 Casual Descriptions. Include unchanged established values within the requested scope. Format requested relationships beneath their source case with the relationship type, exact target case and supported condition. The form assigns parent links. Include points to mandatory reused behavior; extend points from optional behavior to its base; specialize points from child to parent. These links are not sequence arrows, and this is the single canonical catalog.'
  },
  'srs-behavior-casual-descriptions': {
    interviewGuidance: 'Author or refine the short behavioral description (briefDescription) of every eligible existing use case. Reuse adequate descriptions and clarify missing actor intention, system response or successful outcome case by case. Keep the full inventory covered even when many descriptions already suffice; detailed branches come later.',
    draftingGuidance: 'Return the requested complete short descriptions (briefDescription) on the same existing use-case records; do not create another catalog. Preserve carried names and primary actors. Describe intention, essential response and result in a short connected paragraph without inventing policy, screens or detailed branches.'
  },
  'srs-behavior-use-case-map': {
    interviewGuidance: 'Establish the intended coverage and order of every current use-case figure and any agreed missing figure. Discuss the supported catalog, system boundary, participants and meaningful relationships, preserving intentional overlap between figures when it serves the model. Diagrams may be uploaded, generated as an ordered section batch, or generated/replaced one figure at a time. Do not infer existing diagram contents from omitted bytes.',
    draftingGuidance: 'For ordinary metadata scopes, format only the requested supported title, caption or links. A whole diagram section uses the dedicated dsrs-diagrams batch contract and preserves established figure partitions, order, titles and canonical links; an individual figure uses one dsrs-diagram graph and replaces only its file. Both return semantics only, never DrawIO XML, layout or prose. Never claim to have inspected omitted bytes.'
  },
  'srs-behavior-activity-workflows': {
    interviewGuidance: 'Review every current activity figure and identify scenarios where a diagram materially clarifies behavior. Establish the case, scenario, actions, decisions and relevant branches needed for that diagram, with title, caption and case links. A discovered behavior gap must be resolved in the canonical description.',
    draftingGuidance: 'Format the requested activity-figure metadata, named scenario and exact case links. Keep any supported behavioral corrections in their source description. A whole diagram section may generate an ordered dsrs-diagrams batch; an individual activity figure continues to use one dsrs-diagram response and replaces only its file. Both generation paths return semantics only, never XML, coordinates, styles or prose. Do not claim omitted diagram bytes were inspected.'
  },
  'srs-behavior-detailed-descriptions': {
    interviewGuidance: 'Cover every eligible case, including each case already present in the tab. Establish its trigger and appropriate detail level. For detailed cases, walk through ordered actor/system actions, conditions, success and failure outcomes, and each relevant alternative or subflow with branch and return/end points. Reuse settled steps, but do not stop while another case has consequential gaps. Simple cases may remain overviews without a justification essay.',
    draftingGuidance: 'Format every requested case with its agreed trigger, detail level and applicable description fields. Number normal actor/system steps; label subflows and alternatives with their origin, condition and return or termination. Preserve necessary detail and existing case IDs. Overview-only cases need no fabricated hidden flows, reason essay or unsupported diagram claim.'
  },
  'srs-behavior-functional-requirements': {
    interviewGuidance: 'Review every current functional obligation against the established use-case behavior. Clarify missing observable responses, rules or outcomes and uncovered behavior without manufacturing a requirement for every action. Resolve overlap and material ambiguity before the handoff.',
    draftingGuidance: 'Format each requested functional requirement as one clear observable obligation with exact existing use-case links and established status. Add acceptance detail only when the statement does not already make success clear. Preserve shared IDs and avoid duplicate obligations.'
  },
  'srs-quality-operating-context': {
    interviewGuidance: 'Establish the actual operating environment and cover each current constraint. Clarify missing deployment or operating conditions and genuinely binding limits, distinguishing them from design preferences. Reuse the existing scope and constraints.',
    draftingGuidance: 'Provide the requested concise operating-environment description and complete constraint records from established conditions. Keep confirmed constraints, proposed choices and unverified assumptions distinct; do not invent platforms or legal applicability.'
  },
  'srs-quality-attributes': {
    interviewGuidance: 'Review every quality category and each existing obligation. Establish applicability and clarify measurable targets, conditions or missing behavior that matters to the project. Cover all current records without treating a category as a reason to invent requirements. Unknown applicability or targets remain explicit.',
    draftingGuidance: 'Return the requested applicability choices and complete quality-requirement records. Put supported measurable targets and conditions in the statement. Keep unagreed targets proposed; use supported status and exact links. A non-applicable category needs no placeholder obligation or findings essay.'
  },
  'srs-quality-interface-requirements': {
    interviewGuidance: 'Cover every interface category and existing boundary obligation. For each actual exchange, clarify the external party, information or compatibility contract and necessary failure behavior. Reuse existing behavior and check missing dependencies or roles. Categories may be deliberately non-applicable.',
    draftingGuidance: 'Format the requested applicability choices and interface obligations with their agreed external boundary, contract, failure behavior and exact existing links. Group obligations under the established external actor when assigned by the form. Cite shared obligations instead of duplicating them; do not invent devices or protocols.'
  },
  'srs-quality-assumptions': {
    interviewGuidance: 'Review every current assumption and dependency and identify missing conditions on which the project genuinely relies. Clarify the condition, provider where relevant, validation status and material consequence of failure. Reuse resolved decisions and identify actual unresolved questions.',
    draftingGuidance: 'Format each requested assumption or dependency with its established statement and applicable supported qualifications. Preserve validation state separately from decision confirmation. Include material failure consequences when known; do not create unsupported dependencies or a second question register.'
  }
};
