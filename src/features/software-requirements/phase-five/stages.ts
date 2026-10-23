import type { Section } from '../../../core/schema/schema-types.ts';
import { text, recordSection } from '../phase-three/shared.ts';
import { figureSection, links, modelReferences, modelReviewSection, modelStage } from './shared.ts';
import { domainDiagramConfig, interactionDiagramConfig, stateDiagramConfig, uiDiagramConfig } from './diagram-config.ts';
import { domainEvidence, interactionEvidence, stateEvidence, uiEvidence } from './evidence.ts';

const concepts:Section=recordSection(
  'domain-concepts','Domain Concepts','analysis-models.domain',1,
  'domainConcepts','SRS-DOM-','name',[
    text('name','Domain concept / responsibility',{type:'text',completion:true,
      placeholder:'Use an established vocabulary term or the name of a genuinely new conceptual entity.'}),
    text('meaning','Meaning and boundary of the concept',{completion:true,
      placeholder:'One project-specific definition. Correct the canonical glossary if the term differs.'}),
    text('responsibilities','Responsibilities and domain rules (when supported)',{completion:false,optional:true}),
    text('attributes','Relevant information / attributes (when supported)',{completion:false,optional:true,
      aiHint:'Describe domain data without prescribing database columns, types or internal implementation.'}),
    links('relatedConceptReferences','Related domain concepts',modelReferences.concepts),
    text('relationshipNotes','Supported conceptual relationships (if useful)',{completion:false,optional:true}),
    links('useCaseReferences','Behaviors establishing this concept',modelReferences.cases),
    text('requirementReferences','Existing requirement IDs affected (optional)',
      {type:'text',completion:false,optional:true,placeholder:'SRS-FR-001, SRS-QR-002...'}),
    text('openQuestions','Missing or inconsistent responsibilities (optional)',{completion:false,optional:true})
  ],{
    minimum:0,completionMinimum:0,completionMode:'all-required',completionFields:['name','meaning'],
    itemLabel:'Domain concept',addLabel:'Add domain concept',emptyText:'No new model concepts needed yet. Reuse the glossary and existing actors/use cases before adding a domain entity.'
  }
);

export const domainModelStage=modelStage({
  id:'srs-models-domain',stateKey:'domainModel',label:'Domain & Class Model',
  description:'Identify only the domain objects, attributes, responsibilities and relationships needed to explain established behavior; use a class/domain figure to test that understanding.',
  target:'analysis-models.domain',evidence:domainEvidence,
  sections:[
    modelReviewSection('domain-review','analysis-models.domain',
      'Check vocabulary, use-case objects, functional requirements and binding constraints for missing concepts or responsibilities.'),
    concepts,
    figureSection('domain-figures','Domain and Class Figures','analysis-models.domain','domain-class-model',domainDiagramConfig,[
      links('domainConceptReferences','Concepts illustrated',modelReferences.concepts),
      text('modelFocus','Concepts and responsibilities emphasized',{optional:true,completion:false}),
      text('relationshipNotes','Association, multiplicity and generalization evidence',{optional:true,completion:false})
    ])
  ],
  task:'Identify the smallest defensible domain vocabulary and responsibilities, then compare conceptual relationships against named use cases, data flows and existing requirements. Add SRS-DOM records only for genuinely new model concepts.',
  definitions:[
    {term:'Domain concept',definition:'A meaningful thing or responsibility in the subject area; not an implementation class.'},
    {term:'Class relationship',definition:'A supported association, composition or specialization among conceptual entities.'}
  ],
  steps:[
    {title:'Reconcile the language',text:'Read existing terms, object flows and behavior. Update the original vocabulary when an established concept is inconsistent.'},
    {title:'Model responsibilities',text:'Use SRS-DOM entries only when a new concept is genuinely needed. Record its meaning, key data and responsibilities without choosing architecture.'},
    {title:'Cross-check the figure',text:'Upload or generate a domain/class model with labeled relationships. Use uncovered concepts to revisit the original use cases and requirements.'}
  ]
});

export const interactionModelsStage=modelStage({
  id:'srs-models-interactions',stateKey:'interactionModels',label:'Interaction Models',
  description:'Walk through selected normal or exception paths as communications among conceptual participants, exposing unsupported messages or missing responsibility.',
  target:'analysis-models.interaction',evidence:interactionEvidence,
  sections:[
    modelReviewSection('interaction-review','analysis-models.interaction',
      'Compare every modeled message and response with a named existing normal/subflow/exception path.'),
    figureSection('interaction-figures','Interaction Figures','analysis-models.interaction','interaction-model',interactionDiagramConfig,[
      text('scenarioPath','Use-case path / named scenario',{completion:true,
        placeholder:'SRS-UC-003 normal flow, or its specific alternative/exception path'}),
      links('actorReferences','Participants / actors',modelReferences.actors),
      links('domainConceptReferences','Participating domain concepts',modelReferences.concepts),
      text('messageSequence','Ordered responsibility/message findings',{optional:true,completion:false,
        placeholder:'Only behaviors missing or inconsistent with the current detailed path.'})
    ])
  ],
  task:'Choose meaningful use-case paths and trace ordered requests, responses and events through collaborating roles or conceptual objects. Return missing operations and unsupported message assumptions to the same detailed paths and existing functional requirements.',
  definitions:[
    {term:'Interaction model',definition:'An independent communication view of one established use-case scenario.'},
    {term:'Message',definition:'A request, result or event between participants, grounded in a source scenario.'}
  ],
  steps:[
    {title:'Choose a supported path',text:'Identify the saved SRS-UC ID and normal, alternative or exception path, including trigger and outcome.'},
    {title:'Trace participants and messages',text:'Use conceptual responsibilities, not guessed internal classes; label message order and significant responses.'},
    {title:'Correct the behavioral source',text:'Compare each exchange to the same detailed use case and linked requirements. Log contradictions through the existing issue register.'}
  ]
});

export const stateModelsStage=modelStage({
  id:'srs-models-state',stateKey:'stateModels',label:'State Models',
  description:'Model significant object lifecycles, events and guards where a state view can expose missing transitions or conflicting requirements.',
  target:'analysis-models.state',evidence:stateEvidence,
  sections:[
    modelReviewSection('state-review','analysis-models.state',
      'Check meaningful stateful concepts for missing triggers, invalid transitions and required failure/recovery behavior.'),
    figureSection('state-figures','State Figures','analysis-models.state','state-model',stateDiagramConfig,[
      {key:'statefulConceptId',label:'Stateful domain concept',type:'select',default:'',reference:modelReferences.concepts,options:[],completion:false},
      text('eventsAndGuards','Important events, guard conditions and invariants',{optional:true,completion:false}),
      text('transitionNotes','Unmodeled, invalid or unresolved transitions',{optional:true,completion:false})
    ])
  ],
  task:'Select genuinely stateful domain objects; enumerate supported states and events, label guards and lifecycle outcomes, and return uncovered conditions or transitions to canonical use cases/requirements. A state model is not mandatory for every concept.',
  definitions:[
    {term:'State',definition:'A meaningful condition of an object affecting its allowed behavior.'},
    {term:'Guard',definition:'A required condition that determines whether a transition may occur.'}
  ],
  steps:[
    {title:'Choose a stateful object',text:'Use a known SRS-DOM concept or cite the established object. Skip trivial objects without lifecycle-dependent behavior.'},
    {title:'Model events and guards',text:'Identify start, named states, transitions, exceptional outcomes and supported invariants.'},
    {title:'Reconcile lifecycle gaps',text:'Compare events/guards with the canonical use-case paths, failure guarantees and verification obligations.'}
  ]
});

export const uiScenariosStage={
  ...modelStage({
    id:'srs-models-interface-design',stateKey:'interfaceDesignEvidence',label:'UI Scenarios & Evidence',
    description:'Use task paths, storyboards and interface evidence to challenge information flow, feedback, validation, recovery, accessibility and user effort.',
    target:'analysis-models.interface-design',evidence:uiEvidence,
    sections:[
      modelReviewSection('ui-review','analysis-models.interface-design',
        'Review relevant user tasks and externally observable UI responsibilities, not unsupported aesthetic preferences.'),
      figureSection('ui-figures','UI Scenario Figures','analysis-models.interface-design','ui-scenario',uiDiagramConfig,[
        text('scenarioPath','User task / normal or exception path',{completion:true,
          placeholder:'Name an established use-case path and the acting user class.'}),
        links('userClassReferences','Affected user classes',modelReferences.perspectives),
        text('inputFeedback','Inputs, information and confirmations (as supported)',{optional:true,completion:false}),
        text('failureRecovery','Validation, error feedback and recovery path (as supported)',{optional:true,completion:false}),
        text('accessibilityFindings','Relevant accessibility and usability findings',{optional:true,completion:false}),
        text('interfaceRequirementReferences','Related existing interface/quality requirement IDs',{optional:true,completion:false,type:'text'})
      ])
    ],
    task:'Derive specific interface scenarios from known user-class characteristics, detailed use-case paths and requirements. Examine navigation, inputs/outputs, failure/recovery and supported accessibility expectations. Return any uncovered contract to the existing interface or quality requirement.',
    definitions:[
      {term:'Storyboard',definition:'A sequence of views showing how a user achieves a named task.'},
      {term:'Feedback and recovery',definition:'What the system communicates on success, invalid input or failure, and how a user continues.'}
    ],
    steps:[
      {title:'Select a real task',text:'Choose a named use-case path and the user class that performs it; reuse earlier actors and interface requirements.'},
      {title:'Follow the information',text:'Model what the user sees, enters and receives, including error paths and meaningful recovery.'},
      {title:'Compare against obligations',text:'Record supported storyboard or mockup evidence. Correct the original interface/quality and behavioral requirements when necessary.'}
    ]
  }),
  documentTargets:['analysis-models.interface-design','external-interfaces.user']
};

export const phaseFiveStages=Object.freeze([
  domainModelStage,interactionModelsStage,stateModelsStage,uiScenariosStage
]);
