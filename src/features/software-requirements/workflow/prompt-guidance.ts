import type { AiGuidance } from '../../../core/schema/schema-types.ts';

// Domain guidance only. The core interview and formatter own the shared conversation/output contracts.
type StagePromptGuidance = Pick<AiGuidance, 'interviewGuidance' | 'draftingGuidance'>;

export const promptGuidance: Record<string, StagePromptGuidance> = {
  'srs-baseline-evidence-intake': {
    interviewGuidance: "Use established project facts and the shared question register. Ask only about a material unresolved conflict, missing source or decision; skip generic readiness checks.",
    draftingGuidance: 'Format the requested shared questions, affected record references, status and resolution from established facts. Keep unanswered questions explicit; record a resolution or accepted exception only when its answer or acceptance is confirmed. Do not write a baseline acceptance essay.'
  },
  'srs-baseline-specification-frame': {
    interviewGuidance: "Reuse the settled project purpose and identity. Ask only for a missing specification audience, release boundary or material product-context distinction.",
    draftingGuidance: 'Write a brief specification purpose, the requested audience records and necessary product-context refinement. An audience is a reader of the specification, not automatically a stakeholder or actor. Use only established product, release and environment facts.'
  },
  'srs-baseline-scope': {
    interviewGuidance: "Start from the agreed client boundary and existing decisions. Clarify only a material unknown inclusion, exclusion, deferral, constraint, dependency or disposition.",
    draftingGuidance: 'Format material scope-decision records using the agreed decision type, statement, status and supported links. Reuse the carried inclusions and exclusions; do not duplicate the original business case or turn a benefit or concern into a capability.'
  },
  'srs-baseline-vocabulary': {
    interviewGuidance: "Derive concise definitions from known project language. Ask only when a term has conflicting meanings or a reader-critical concept genuinely lacks a definition.",
    draftingGuidance: 'Provide each requested term with a concise definition in this project and usage notes only when useful. Use established language from the conversation and supplied evidence; preserve distinctions instead of inventing entities, acronyms or policies.'
  },
  'srs-discovery-perspectives': {
    interviewGuidance: "Reuse established stakeholder and user-class groups. Clarify only missing groups or characteristics that materially affect product use; do not invent people.",
    draftingGuidance: 'Format every requested user-class name and its relevant usage characteristics. Reuse established stakeholder names. A sponsor or specification reader does not automatically become a user class or actor.'
  },
  'srs-discovery-actors-goals': {
    interviewGuidance: "Derive each actor and goal from established interactions. Ask only about unclear role boundaries, missing useful outcomes or consequential uncovered actors. Leave flows for later.",
    draftingGuidance: 'Format the requested actor records and their complete goal records beneath the correct actor, including supported optional role clarification. Use existing actor and goal IDs for identification; the form assigns each goal actor link. Primary and supporting participation is specific to a use case.'
  },
  'srs-discovery-processes': {
    interviewGuidance: "Account for every eligible use case and directed relationship using the actor-goal inventory. Ask only about missing links, overlapping behavior, disposition or relationship semantics; descriptions and flows belong later.",
    draftingGuidance: 'Produce the complete requested use-case records, grouped under their primary actor, using verb–noun names, agreed disposition, supporting actors and goals served. Do not request or return a short behavioral description here; briefDescription is authored in 03.1 Casual Descriptions. Include unchanged established values within the requested scope. Format requested relationships beneath their source case with the relationship type, exact target case and supported condition. The form assigns parent links. Include points to mandatory reused behavior; extend points from optional behavior to its base; specialize points from child to parent. These links are not sequence arrows, and this is the single canonical catalog.'
  },
  'srs-behavior-casual-descriptions': {
    interviewGuidance: "Use established actor intentions, system responses and successful outcomes to draft short descriptions for all eligible cases. Ask only where a meaningful behavior fact is missing; do not ask the user to dictate each paragraph.",
    draftingGuidance: 'Return the requested complete short descriptions (briefDescription) on the same existing use-case records; do not create another catalog. Preserve carried names and primary actors. Describe intention, essential response and result in a short connected paragraph without inventing policy, screens or detailed branches.'
  },
  'srs-behavior-use-case-map': {
    interviewGuidance: "Reuse the canonical catalog and agreed figure partitions. Clarify only material missing coverage or relationship meaning; do not infer saved diagram contents from omitted bytes.",
    draftingGuidance: 'For ordinary metadata scopes, format only the requested supported title, caption or links. A whole diagram section uses the dedicated dsrs-diagrams batch contract and preserves established figure partitions, order, titles and canonical links; an individual figure uses one dsrs-diagram graph and replaces only its file. Both return semantics only, never DrawIO XML, layout or prose. Never claim to have inspected omitted bytes.'
  },
  'srs-behavior-activity-workflows': {
    interviewGuidance: "Derive useful activity scenarios from recorded behavior. Ask only about missing decisions, paths or action ownership that affect a figure; correct genuine behavior gaps in the canonical description.",
    draftingGuidance: 'Format the requested activity-figure metadata, named scenario and exact case links. Keep any supported behavioral corrections in their source description. A whole diagram section may generate an ordered dsrs-diagrams batch; an individual activity figure continues to use one dsrs-diagram response and replaces only its file. Both generation paths return semantics only, never XML, coordinates, styles or prose. Do not claim omitted diagram bytes were inspected.'
  },
  'srs-behavior-detailed-descriptions': {
    interviewGuidance: "Cover every eligible case using existing descriptions and steps. Ask only about consequential missing triggers, actor/system actions, alternatives, conditions or outcomes; simple cases may remain overviews.",
    draftingGuidance: 'Format every requested case with its agreed trigger, detail level and applicable description fields. Number normal actor/system steps; label subflows and alternatives with their origin, condition and return or termination. Preserve necessary detail and existing case IDs. Overview-only cases need no fabricated hidden flows, reason essay or unsupported diagram claim.'
  },
  'srs-behavior-functional-requirements': {
    interviewGuidance: "Derive distinct observable obligations from recorded behavior. Ask only about uncovered responses, rules or material ambiguity; avoid one requirement per step or repeated obligations.",
    draftingGuidance: 'Format each requested functional requirement as one clear observable obligation with exact existing use-case links and established status. Add acceptance detail only when the statement does not already make success clear. Preserve shared IDs and avoid duplicate obligations.'
  },
  'srs-quality-operating-context': {
    interviewGuidance: "Reuse the settled environment and scope constraints. Clarify only actual unknown operating conditions or binding limits, not unconfirmed design preferences.",
    draftingGuidance: 'Provide the requested concise operating-environment description and complete constraint records from established conditions. Keep confirmed constraints, proposed choices and unverified assumptions distinct; do not invent platforms or legal applicability.'
  },
  'srs-quality-attributes': {
    interviewGuidance: "Determine category applicability from established behavior where supported. Ask only for consequential unknown quality obligations, conditions or agreed targets; do not invent a requirement for every category.",
    draftingGuidance: 'Return the requested applicability choices and complete quality-requirement records. Put supported measurable targets and conditions in the statement. Keep unagreed targets proposed; use supported status and exact links. A non-applicable category needs no placeholder obligation or findings essay.'
  },
  'srs-quality-interface-requirements': {
    interviewGuidance: "Reuse established external parties and exchanges. Ask only about consequential missing interface contracts, compatibility or failure behavior; genuinely inapplicable categories need no filler.",
    draftingGuidance: 'Format the requested applicability choices and interface obligations with their agreed external boundary, contract, failure behavior and exact existing links. Group obligations under the established external actor when assigned by the form. Cite shared obligations instead of duplicating them; do not invent devices or protocols.'
  },
  'srs-quality-assumptions': {
    interviewGuidance: "Reconcile known assumptions and dependencies. Ask only for material unknown conditions, validation, external providers or failure consequences; do not duplicate the question register.",
    draftingGuidance: 'Format each requested assumption or dependency with its established statement and applicable supported qualifications. Preserve validation state separately from decision confirmation. Include material failure consequences when known; do not create unsupported dependencies or a second question register.'
  }
};
