import type { Field, FieldOption, Section, Repeater, SchemaNode, Reference, EvidenceSource, EvidenceGroup, GuideStep, Guide, AiGuidance, AiDefinition, DocumentConfig, Evidence } from '../../../core/schema/schema-types.ts';
// Human help follows the active forms, independently of interview finish lines.
const guide = (title: string, summary: string, ...paragraphs: string[]): Guide => ({ title: `How to complete ${title}`, summary, paragraphs });

export const stageGuides: Record<string, Guide> = {
  'srs-baseline-evidence-intake': guide('Evidence Intake', 'Check the prior project evidence and capture real gaps or conflicts.',
    'Open the connected source panels and review the planning documents needed to begin the specification. Correct an inaccurate answer in its original document so later stages receive the same correction.',
    'Add a shared question for an actual missing fact, ambiguity or conflict. Record an answer or next action when known, then update the affected source. Resolved questions and accepted exceptions remain available here even when hidden from the shared questions panel.'),
  'srs-baseline-specification-frame': guide('Specification Frame', 'Explain the specification’s purpose and identify its readers.',
    'Write a brief purpose naming the product or release and the work this specification supports. Add the people or groups who will use it, such as reviewers, builders or verifiers.',
    'The earlier documents already establish the product context. Use the optional refinement only when that context needs clarification; it is not a second business case.'),
  'srs-baseline-scope': guide('Scope Baseline', 'Carry forward the established boundary and record material changes.',
    'Review the included and excluded work carried from Client Requirements and the capabilities proposed in the System Request. Correct an inaccurate source answer where it originates.',
    'Add a scope decision only for a real inclusion, exclusion, deferral, constraint or assumption. Describe the decision clearly. Proposed decisions remain proposals until confirmed; there is no need to invent an entry for an unchanged boundary.'),
  'srs-baseline-vocabulary': guide('Vocabulary Baseline', 'Give important project terms a consistent meaning.',
    'Add terms that readers need to understand the specification, with a concise definition in this project’s context. Include a usage note only when an alias or distinction matters.',
    'Resolve consequential differences in wording with the source owner. Use the same term in later actors, use cases, requirements and diagrams.'),
  'srs-discovery-perspectives': guide('User Classes', 'Describe the groups whose characteristics affect use of the system.',
    'Reuse relevant stakeholder names and describe characteristics that change how a group uses the product, such as experience, frequency of use or accessibility needs.',
    'A user class groups people with relevant characteristics. It is not automatically an actor: actors are the external roles or systems that interact with the product, identified in the next stage.'),
  'srs-discovery-actors-goals': guide('Actors & Goals', 'Identify external interacting roles and the useful outcomes they seek.',
    'An actor is a role, external system or device that exchanges information or services with the product. Name roles rather than individual people; one person may play several roles.',
    'Add each goal beneath its actor. A goal is a useful outcome, such as booking an appointment, rather than a button press or a sequence of screens. The form assigns the actor link automatically.',
    'Reuse established roles and goals. Add role clarification only when the name and goals are not enough to explain the interaction.'),
  'srs-discovery-processes': guide('Use Cases', 'Organize actor goals into named system interactions.',
    'Add a use case beneath its primary actor, give it a clear verb–noun name, record its disposition and select the goals it serves. Supporting actors and additional links can connect the same case to other participants. Phase 2 identifies behavior; author the short behavioral description in 03.1 Casual Descriptions.',
    'Add a directed relationship only when it has a specific meaning: includes represents required reused behavior, extends represents conditional added behavior, and specializes relates a more specific case to a general one. These arrows do not represent chronological order.'),
  'srs-behavior-casual-descriptions': guide('Casual Descriptions', 'Author or refine the short behavioral description on each existing use case.',
    'Read the carried name and actor, then describe the actor’s intention, the system’s main response and the useful result in a short paragraph. An adequate existing description can remain as it is.',
    'Phase 2 identifies behavior; Phase 3 describes it. This stage owns the short description on the same use case created during discovery, preserving any saved description. Leave numbered steps and branches for Detailed Descriptions, and put real unanswered questions in the shared register.'),
  'srs-behavior-use-case-map': guide('Use-Case Map', 'Show the established actors, system boundary and use cases in a diagram.',
    'Place actors outside the product boundary and use cases inside it. Show actor associations and only the relationships supported by the catalog.',
    'Upload DrawIO/XML/PNG/JPEG, or copy the section or figure’s AI diagram prompt and paste its dsrs-diagram response into Import AI diagram. Select the cases shown before copying to narrow generation, then add a meaningful title and caption. Replacing a file keeps its figure identity. Compare the diagram with the catalog and correct any differences at their source.'),
  'srs-behavior-activity-workflows': guide('Activity Workflows', 'Use diagrams to clarify selected scenarios and difficult behavior.',
    'Choose a scenario with meaningful decisions, responsibilities or parallel work. Show its start and end, actions, decision conditions and any relevant joins or information flows.',
    'Upload the diagram or generate it using the section/figure copy prompt and Import AI diagram. Select the case links and optional scenario before copying to focus the generated workflow, then record its title and caption. Feed discoveries back into the existing descriptions instead of maintaining a second prose account of the diagram.'),
  'srs-behavior-detailed-descriptions': guide('Detailed Descriptions', 'Describe the event paths that need more precision.',
    'Select the appropriate detail level for each existing case and identify its trigger. Simple cases can remain overviews. For a detailed case, number the normal steps and identify who acts, how the system responds and the result.',
    'Add relevant alternatives, exceptional paths or subflows, identifying where they branch and where they resume or end. Keep conditions and rules needed to understand the behavior, and link supporting figures when useful.',
    'Overview cases do not require hidden flow fields. Optional qualifications can stay blank; resolve unknown behavior through the shared questions register.'),
  'srs-behavior-functional-requirements': guide('Functional Requirements', 'State the observable obligations needed to support established behavior.',
    'Write one clear system obligation per entry, using the existing use cases and evidence to identify what the system must do. Link the cases it supports and any useful source locator.',
    'Make success clear in the statement. Add acceptance detail only when the statement needs it to be checked. Avoid copying a whole use-case story into a requirement.'),
  'srs-quality-operating-context': guide('Operating Context', 'Describe the environment and binding limits on system operation.',
    'Explain where and under what conditions the system runs, including established infrastructure or connectivity conditions that matter to the behavior.',
    'Refine existing constraints in place and add only new binding limits. A constraint is an imposed restriction, rather than an unconfirmed design preference. Raise a shared question when the behavior conflicts with an established limit.'),
  'srs-quality-attributes': guide('Quality Attributes', 'Specify how well the established system behavior must work.',
    'For each category, select Applicable, Not applicable or Needs clarification. Applicable categories contain actual requirements; an empty category is not evidence that it has been reviewed.',
    'Write conditions and measurable targets in each statement, such as a response threshold at a specified workload or a recovery time after an outage. Keep proposed targets distinct from agreed ones.',
    'Link relevant behavior and sources instead of repeating functional requirements. Additional acceptance detail is optional when the statement already makes the expected result clear.'),
  'srs-quality-interface-requirements': guide('Interface Requirements', 'Describe obligations at real external boundaries.',
    'Choose the applicability of each interface category. Add requirements beneath the external actor involved, or use the unassigned area when a supported boundary has no established actor yet.',
    'State the required exchange, compatibility or interaction and necessary externally visible failure behavior. Link existing functional or quality obligations instead of repeating them. Interface mockups belong to the later model phase.'),
  'srs-quality-assumptions': guide('Assumptions & Dependencies', 'Identify conditions the project relies on and uncertainties that matter.',
    'Refine the existing assumption records rather than creating duplicates. Name any external dependency and explain a material consequence if the assumed condition fails.',
    'An assumption is a condition treated as true pending evidence; a dependency is something supplied by another party or system. Validation state records the evidence for the condition and is separate from confirmation of the decision. Track real follow-up work in shared questions.')
};

const recordHelp: Record<string, string> = {
  evidenceIssues: 'Record a real question, missing fact or conflict once. Identify affected records, then add the answer or next action. Resolve it only after the relevant source or answer has been updated.',
  audiences: 'Name each person or group that will read or use the specification. Readers may include approvers, developers, testers and operators; they need not all be system users.',
  scopeDecisions: 'Describe a material inclusion, exclusion, deferral, constraint or assumption. Refine the existing decision where possible so its identity and relationships remain intact.',
  terms: 'Give each important project term its own entry and a concise definition. Add a usage note only when needed to distinguish meanings or aliases.',
  perspectives: 'Name the user group and describe characteristics that affect use. Reuse stakeholder names; individual actor goals are recorded in Actors & Goals.',
  actors: 'Name an external interacting role, system or device. Add its goals beneath it; the form creates the relationship. Role clarification is optional when the name and goals already explain its purpose.',
  goals: 'Describe a useful outcome sought by the actor, rather than an interface action. Goals belong beneath their actor and can later be linked to use cases.',
  useCases: 'Identify the interaction by name, primary actor and disposition. Select existing goal and participant links instead of creating duplicate records. Author its short behavioral description in 03.1 Casual Descriptions.',
  useCaseRelationships: 'Select the source case, relationship and target case. Includes means required reuse, extends means conditional added behavior, and specializes means a more specific case. Add a condition when it explains the relationship.',
  artifacts: 'Upload DrawIO/XML/PNG/JPEG or import a dsrs-diagram response from the section/figure copy prompt. The app creates an editable DrawIO file. Give the figure a title and caption. Select the use cases it shows. Replacing the file preserves its figure ID; discoveries belong in the affected source records.',
  requirements: 'Write one supported, observable obligation per record. Link existing behavior and sources. Add acceptance detail only when the statement does not already make success clear.'
};

const sectionHelp: Record<string, string> = {
  'casual-stories': 'Author or refine the short description as a concise account of the actor’s intention, system response and useful result. Existing saved descriptions remain on the same use-case records. The name and actor are carried context; detailed steps come later.',
  'detailed-stories': 'Choose the detail level and identify the trigger. Detailed cases need a numbered normal flow, with relevant alternatives or subflows showing their branch and return points. Overview cases can leave flow fields blank.',
  'operating-constraints': 'Refine binding limits carried from Scope Baseline. Describe only actual restrictions on the system; do not present an unconfirmed implementation preference as a constraint.',
  assumptions: 'Refine existing assumptions and external dependencies. Describe the condition relied on and a material consequence if it fails. Validation evidence is separate from decision confirmation.',
  operational: 'Specify supported operating, usability, compatibility or maintenance expectations. State the conditions and observable result rather than simply asking for the system to be easy to use.',
  performance: 'Specify response, capacity, availability or recovery targets with workload, units and measurement conditions. Preserve proposed targets until they are agreed.',
  security: 'Specify access, protection or audit obligations for established roles and information. Link existing behavioral checks and state the remaining security or privacy requirement.',
  'cultural-political': 'Record supported language, accessibility, policy or jurisdiction obligations. Identify the relevant audience or authority; a category alone does not establish applicability.',
  user: 'Specify required human interaction, input, output, feedback or accessibility behavior at the boundary. Detailed mockups come later; link existing obligations rather than restating them.',
  hardware: 'Describe required exchanges or compatibility with actual external devices. Include necessary signal or data behavior and externally visible failures.',
  software: 'Describe required exchanges with external applications, services or files. State the information, compatibility and failure behavior needed at the boundary.',
  communication: 'State the required communication or interoperability conditions for established exchanges. Specify a protocol or transport only when it is supported by the project evidence.'
};

export function humanSectionHelp(section: Section): string {
  const dataKey = section.repeatable?.dataKey;
  return sectionHelp[section.id] || (dataKey ? recordHelp[dataKey] : "") || section.description || '';
}

export const scalarSectionHelp: Record<string, string> = {
  'carried-scope': 'These included and excluded boundaries come from Client Requirements. Correct them there. Add a scope decision only for a material change or unresolved boundary question.',
  'specification-purpose': 'Briefly explain which product or release this specification defines and what work it supports. Refine the product context only when the carried context needs clarification.',
  'operating-environment': 'Describe where the system runs and the operating conditions that matter, such as established infrastructure, hours of use or connectivity. Do not repeat the project scope.'
};
