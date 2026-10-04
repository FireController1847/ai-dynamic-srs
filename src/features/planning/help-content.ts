import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../core/schema/schema-types.ts';
// Help for people using the forms. AI instructions are defined separately.
export const planningSectionHelp: Record<string, string> = {
  'project-details': 'Name the project and organization here. Other documents reuse this identity, so correct it here when it changes. Preparation details are optional.',
  'business-context': 'Describe the current problem and the improvement the client wants. Include a success measure when one is known; an unsupported target is better left out.',
  stakeholders: 'Add each affected person or group once and identify its role. Important concerns can be added when they help explain the need.',
  'client-needs': 'Give each requested outcome or capability its own entry, using the client’s language. Describe the need rather than deciding how the solution will be built.',
  'scope-constraints': 'State what the project includes and any known exclusions. Add binding limits or assumptions only when they materially affect the boundary.',
  'discovery-record': 'Identify the interviews or documents behind the answers, with a useful date or locator. Keep unanswered questions separate from confirmed facts.',
  'request-details': 'Project identity is carried from Client Requirements. Use these optional fields to identify the preparer and version of this request.',
  'project-sponsor': 'Identify the person accountable for backing the project and their business role. This is the sponsor, which may differ from the primary client contact.',
  'business-need': 'These answers come directly from Client Requirements. Edit the original problem or desired outcome there to update every document that uses it.',
  'business-requirements': 'Describe the high-level capabilities being proposed. Link each capability to the client needs it serves; several needs may support one capability.',
  'business-value': 'Explain the improvement expected from a capability and who benefits. Add benefits beneath their capability to set the link automatically, or use the shared area for project-wide benefits.',
  'special-issues': 'Record new issues that affect the proposal, such as an unresolved dependency or delivery restriction. Select the current disposition and add an action only when useful.',
  'model-setup': 'Choose the analysis horizon, currency, discount rate and cash-flow timing. Cite the basis for the discount rate in the assumptions when needed. All financial entries must use the same currency.',
  'benefit-drivers': 'Add one supported benefit per entry. Financial benefits can use current-versus-target quantities or a sourced annual amount. Choose a realization pattern for when value appears; nonfinancial benefits need no monetary estimate.',
  'one-time-costs': 'Enter each cost amount and the year it is paid. Year 0 means the initial investment. Link a source where available and explain only assumptions needed to interpret the estimate.',
  'ongoing-costs': 'Choose the recurring cost schedule, then fill the amount and timing fields shown for that schedule. Custom schedules accept one amount per analysis year, including zero in years without a payment.',
  'financial-summary': 'Use the calculated results to choose a recommendation and explain the decisive uncertainty. The recommendation expresses an analysis conclusion; it does not record approval to proceed.',
  'evidence-sources': 'Create a source entry once, with its name and a useful reference. Link estimates to that entry. Label an analyst assumption honestly rather than presenting it as a confirmed quote.',
  'analysis-details': 'The project name comes from Client Requirements. These optional details identify the preparer, date and version of the feasibility analysis.',
  'stakeholder-analysis': 'This list is carried from Client Requirements. Correct names or roles there. Put concerns about adoption or organizational support in the organizational assessment below.',
  'technical-feasibility': 'Explain whether the project can be built and operated with available or obtainable technology and skills. Focus on the evidence and material limits; record risks that need a response in the risk list.',
  'carried-cba-decision': 'The financial conclusion is carried from the Cost-Benefit Analysis. Correct its estimates or interpretation there. The live results above provide the financial basis for this assessment.',
  'economic-feasibility': 'Add a funding or affordability consideration only when the CBA has not already addressed it. There is no need to repeat its totals or financial recommendation.',
  'organizational-feasibility': 'Explain whether the organization can adopt and sustain the change. Include relevant sponsor support, user concerns, training or process changes without writing a separate assessment for every topic.',
  'feasibility-risks': 'Add material risks that could change the recommendation. Explain the consequence and, where known, the response or condition to proceed. Update the status as the risk is addressed.',
  'overall-recommendation': 'Choose the analyst’s recommendation and give the decisive reason. Add conditions only when needed. Record an authorized decision separately, and only when the decision maker has actually made it.'
};

export const planningGuides: Record<string, Guide> = {
  'Understand the request': {
    title: 'How to complete Client Requirements',
    summary: 'Establish the client’s problem, desired result, people, needs and project boundary.',
    paragraphs: [
      'Start with project identity, the current situation and the improvement the client wants. Add the affected people and groups, then give each distinct need its own entry.',
      'Define the included work and known exclusions. Record the sources behind the answers and any real follow-up questions. Later documents reuse this information, so update the original answer here when it changes.',
      'Completion tracks the essential answers and entries. Supporting detail is optional; a completed form does not mean that the project has been approved.'
    ]
  },
  'Propose the project': {
    title: 'How to complete the System Request',
    summary: 'Turn the established client needs into a short proposal and business case.',
    paragraphs: [
      'Identify the sponsor, then review the carried business need. Add high-level capabilities and select the client needs they serve. Add expected benefits beneath the relevant capability, or in the shared area when they apply to the whole project.',
      'Record only new issues affecting the proposal. Financial estimates belong in the Cost-Benefit Analysis, and judgments about practicality belong in Feasibility Analysis. Correct carried client information at its source.'
    ]
  },
  'Compare costs and benefits': {
    title: 'How to complete the Cost-Benefit Analysis',
    summary: 'Model supported benefits and costs over time, then assess the financial case.',
    paragraphs: [
      'Set the horizon, currency, discount rate and timing convention. Add benefits, initial payments and recurring costs with the amount and schedule supported by the evidence. Nonfinancial benefits can remain unquantified.',
      'Create source entries and link them to estimates. Review the cash flows, present values, NPV, ROI and break-even results; the application calculates these rather than asking you to re-enter them.',
      'Choose the economic recommendation and explain its decisive basis and uncertainty. Revisit the inputs if an assumption changes. A favorable result is evidence for a decision, rather than authorization to spend.'
    ]
  },
  'Assess feasibility': {
    title: 'How to complete Feasibility Analysis',
    summary: 'Assess whether the proposal is technically achievable and organizationally supportable.',
    paragraphs: [
      'Review the proposal, carried stakeholder list and live CBA results. Write a concise technical assessment and organizational assessment. Add funding considerations only when they are not already covered by the CBA.',
      'Record material risks and available responses, then choose a recommendation and give the decisive reason. Conditions and an authorized decision can be recorded separately when known. Carried stakeholder records and optional detail do not count against completion.'
    ]
  }
};
