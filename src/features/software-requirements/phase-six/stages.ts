import type { Field, Section, SchemaNode, EvidenceSource, GuideStep } from '../../../core/schema/schema-types.ts';
import { text, choice, recordSection } from '../phase-three/shared.ts';
import { requirementDisplayId, requirementFilter, requirementKindField } from '../requirement-records.ts';
import { evidenceIntakeStage } from '../phase-one/evidence-intake.ts';
import { catalogSource, detailSource, mapSource, activitySource } from '../phase-three/evidence.ts';
import { functionalSource, operatingSource, attributesSource, interfacesSource } from '../phase-four/evidence.ts';
import { domainSource, interactionSource, stateSource } from '../phase-five/evidence.ts';
import { followUpGuidance } from '../issue-follow-up.ts';

const issueOriginal = evidenceIntakeStage.sections?.find(section => section.id === 'baseline-exceptions');
if (!issueOriginal?.repeatable) throw new Error('The shared SRS-ISS schema is missing.');

const sources: EvidenceSource[] = [
  catalogSource,detailSource,functionalSource,operatingSource,attributesSource,interfacesSource,
  domainSource,interactionSource,stateSource,
  {pageId:'software-requirements-specification',nodeId:'srs-models-interface-design',
    subpageSelections:{'software-requirements-specification':'srs-cross-check-models','srs-cross-check-models':'srs-models-interface-design'},
    dataPath:['softwareRequirementsSpecification','modelCrossChecks','interfaceDesignEvidence'],
    reason:'UI scenarios expose validation, feedback and error recovery gaps in existing behavior.',
    groups:[{sectionId:'ui-figures'}]}
];

function decision(id:string,title:string,target:string,question:string):Section {
  return {
    id,key:id,title,documentTarget:target,description:question,
    help:'This records the human reconciliation judgment, not the results of a completed software test. The live report and existing records provide the evidence.',
    fields:[
      choice('reviewOutcome','Review disposition',
        ['In progress','Reviewed with open findings','Reviewed; no known structural gaps'],{completion:true}),
      text('reviewEvidence','Decisions and unresolved semantic discrepancies (when needed)',
        {optional:true,completion:false,rows:3,
          placeholder:'State exact saved IDs, source corrections, or SRS-ISS issues. Do not repeat the live coverage table.'}),
      text('issueReferences','Linked SRS-ISS issue IDs (when needed)',
        {type:'text',optional:true,completion:false,placeholder:'SRS-ISS-001, SRS-ISS-002'})
    ]
  };
}

function requirementView(kind:'Functional'|'Quality'|'Interface'):Section {
  const base=recordSection('verify-'+kind.toLowerCase(),kind+' Requirement Verification',
    'verification-traceability.verification',1,'requirements',requirementDisplayId(kind).prefix,'statement',[
      requirementKindField(kind),
      {key:'statement',label:'Canonical requirement statement',type:'textarea',default:'',editable:false,completion:false,
        aiHint:'This is carried from Phase 3/4. Edit the original requirement if incorrect.'},
      text('sourceReferences','Supporting evidence/source locators',{type:'text',optional:true,completion:false}),
      text('useCaseReferences','Affected use case IDs',{type:'text',optional:true,completion:false}),
      ...(kind==='Functional'?[text('flowReferences','Recorded path and step references',
        {type:'text',optional:true,completion:false})]:[]),
      text('acceptanceCriterion','Observable acceptance criterion',{completion:true,rows:2}),
      choice('verificationMethod','Planned verification method',['Test','Demonstration','Inspection','Analysis'],{completion:true}),
      {key:'status',label:'Review status (from requirement register)',type:'text',default:'',editable:false,completion:false}
    ],{
      allowAdd:false,allowRemove:false,minimum:0,completionMinimum:0,completionMode:'all-required',
      completionFields:['acceptanceCriterion','verificationMethod'],
      recordFilter:requirementFilter(kind),itemLabel:kind+' requirement',
      emptyText:'No active '+kind.toLowerCase()+' requirements. Create or correct them in Phase 3/4.'
    });
  return {
    ...base,includeInPreview:false,
    description:'This is an editable view of the same requirement records. It does not create another verification or traceability catalog.'
  };
}

function stage(args:{
  id:string;stateKey:string;label:string;description:string;targets:string[];
  sections:Section[];steps:GuideStep[];task:string
}):SchemaNode {
  return {
    id:args.id,stateKey:args.stateKey,label:args.label,description:args.description,
    documentTargets:args.targets,formComponent:'reconciliation-stage-form',
    previewComponent:'reconciliation-stage-preview',
    form:{kicker:'Phase 6 · Reconcile & Verify',intro:args.description,showCompletion:true},
    evidence:{title:'Canonical evidence to reconcile',
      summary:'These are live views of the existing records, not new source copies. Change incorrect values where they were originally authored.',
      sources},
    guide:{title:args.label,summary:args.description,
      steps:[...args.steps,{title:'Carry forward confirmed corrections',text:followUpGuidance}]},
    ai:{showInterview:true,task:args.task,
      definitions:[
        {term:'Coverage',definition:'Evidence that each in-scope obligation is represented and each requirement has a supported origin.'},
        {term:'Verification plan',definition:'The acceptance criterion and method proposed to assess a requirement; not a result or proof of passing.'}
      ],
      interviewGuidance:'Start from the live requirement/path coverage and existing unresolved issues. Ask only material semantic gaps not settled by prior facts. Cite exact record IDs. Do not ask for a second traceability matrix or promise software was tested.',
      draftingGuidance:'Record one brief, evidence-based review disposition, any uncovered semantic discrepancies and SRS-ISS links. Correct canonical use cases, requirements, actors and models in their original sections; do not invent outcomes, approve proposed thresholds, or claim a test was executed.'
    },
    sections:args.sections
  };
}

export const coverageStage=stage({
  id:'srs-reconciliation-coverage',stateKey:'coverageReview',label:'Coverage Review',
  description:'Review automatically linked goals, active use cases, figures, requirements and acceptance plans. Reconcile missing paths and unsupported obligations in their original records.',
  targets:['verification-traceability.coverage'],
  sections:[decision('coverage-decision','Coverage Review Decision','verification-traceability.coverage',
    'After inspecting the live coverage report, what genuine omissions or unsupported statements remain?')],
  steps:[
    {title:'Inspect both directions',text:'Review goals without use cases, cases without functional obligations, and requirements without supported sources.'},
    {title:'Check meaningful paths',text:'A linked SRS-UC ID does not prove each normal, alternate and exception path is specified; compare actual path text and source-step references.'},
    {title:'Fix at the source',text:'Update the existing use case, requirement, goal or shared SRS-ISS issue, then review the recalculated coverage.'}
  ],
  task:'Reconcile source/goal → actor/use case → scenario/model → requirement → acceptance/verification coverage without retyping a matrix.'
});

export const consistencyStage=stage({
  id:'srs-reconciliation-consistency',stateKey:'consistencyReview',label:'Cross-Model Consistency',
  description:'Compare terminology, role boundaries, responsibilities, events, transitions, interface behavior and recorded constraint/quality decisions across representations.',
  targets:['verification-traceability.coverage'],
  sections:[decision('consistency-decision','Consistency Review Decision','verification-traceability.coverage',
    'Where do models or requirements disagree about names, scope, responsibility, states or measurable conditions?')],
  steps:[
    {title:'Compare source IDs',text:'Check links and inactive references across behavior, models and the requirement register.'},
    {title:'Challenge meaning',text:'Compare the actual story, communication, state guards and interface contracts—not just matching IDs.'},
    {title:'Keep authority explicit',text:'Do not promote a proposed quality target or an unverified dependency because another model repeats it.'}
  ],
  task:'Identify exact conflicting canonical records and supported corrections, not a duplicate model or requirement list.'
});

export const gapsStage=stage({
  id:'srs-reconciliation-gaps',stateKey:'gapResolution',label:'Gaps & Conflicts',
  description:'Revisit open or overdue SRS-ISS questions, accepted exceptions, model-review differences, unverified assumptions and proposed targets.',
  targets:['verification-traceability.coverage'],
  sections:[
    decision('gaps-decision','Gap Resolution Decision','verification-traceability.coverage',
      'Which issues are resolved with evidence, accepted as exceptions, or still require an owner and action?'),
    {...issueOriginal,id:'reconciliation-issues',key:'reconciliationIssues',
      title:'Shared SRS Issues',includeInPreview:false,
      description:'Edit the original SRS-ISS register here. Save each confirmed resolution with owner and authority; never close an issue just to improve completion.'}
  ],
  steps:[
    {title:'Revisit outstanding questions',text:'Use the same SRS-ISS IDs, due-phase, owner and next-action fields from the baseline.'},
    {title:'Challenge premature closure',text:'Resolved and accepted-exception statuses require a confirmed answer, authority/evidence and responsible owner.'},
    {title:'Preserve exceptions',text:'Record accepted exception scope and rationale. Do not suppress it from final assembly.'}
  ],
  task:'Review unresolved and due questions, issues and assumptions; preserve the audit trail and only record supported decisions.'
});

export const verificationStage=stage({
  id:'srs-reconciliation-verification',stateKey:'verificationTraceability',label:'Verification & Traceability',
  description:'Inspect the live requirement-to-source and scenario/model links, then complete missing acceptance criteria and planned verification methods on the canonical requirement records.',
  targets:['verification-traceability.traceability','verification-traceability.verification'],
  sections:[
    decision('verification-decision','Verification Planning Review','verification-traceability.verification',
      'Are every active requirement’s origins, observable acceptance and planned method defensible?'),
    requirementView('Functional'),requirementView('Quality'),requirementView('Interface')
  ],
  steps:[
    {title:'Follow the derived links',text:'Use the live matrix generated from saved goal, use-case, model, source and requirement references. Do not maintain a second manual mapping.'},
    {title:'Plan meaningful verification',text:'For each active requirement, name the observable passing condition and choose Test, Demonstration, Inspection or Analysis.'},
    {title:'Keep results separate',text:'A method or criterion is a plan, not execution evidence. Do not mark any test passed or infer requirement approval.'}
  ],
  task:'Verify that every requirement has a supported origin, correct linked scenario/model, objective criterion, and planned verification method without fabricating results.'
});

/**
 * Editorial quality pass only. No saved review disposition is required; the
 * canonical source fields are changed solely after individual user approval.
 */
export const cleanupStage: SchemaNode = {
  id:'srs-reconciliation-cleanup',stateKey:'editorialCleanup',label:'AI Cleanup (Optional)',
  description:'Optionally shorten repeated or wordy SRS descriptions with an AI-assisted, review-first editorial pass before document assembly.',
  documentTargets:[],formComponent:'ai-cleanup-stage-form',previewComponent:false,
  workflow:{required:false},
  form:{kicker:'Phase 6 · Reconcile & Verify',showCompletion:false,fullWidth:true},
  guide:{
    title:'Optional AI cleanup',
    summary:'Improve readability without changing the meaning, status or traceability of established project information.',
    steps:[
      {title:'Copy a complete review prompt',text:'The prompt contains saved workspace context and an exact list of existing editable SRS narrative fields. It never sends figure file bytes.'},
      {title:'Request concise replacements',text:'ChatGPT returns only fields that can be made shorter without deleting unique behavior, requirements, decisions or references. No follow-up interview is needed.'},
      {title:'Validate and review',text:'Paste the cleanup JSON, compare each proposed replacement to the original, then select only the safe edits to apply.'},
      {title:'Continue to assembly',text:'Skipped or rejected suggestions leave saved data untouched. Phase 7 assembles the existing canonical fields as usual.'}
    ]
  },
  ai:{showInterview:false},
  sections:[]
};

export const phaseSixStages=Object.freeze([coverageStage,consistencyStage,gapsStage,verificationStage,cleanupStage]);
