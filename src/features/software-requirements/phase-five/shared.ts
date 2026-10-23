import type { DiagramConfig, DiagramEvidenceSource } from '../../../core/artifacts/diagram-graph.ts';
import type { Field, Reference, Section, SchemaNode, EvidenceSource, GuideStep } from '../../../core/schema/schema-types.ts';
import { text, choice, recordSection, recordsPath } from '../phase-three/shared.ts';
import { followUpGuidance } from '../issue-follow-up.ts';

export const modelReferences: Record<string, Reference> = {
  cases:{dataPath:[...recordsPath,'useCases'],displayId:{prefix:'SRS-UC-',padding:3},labelField:'name',
    recordFilter:{key:'disposition',in:['Candidate','Ready for elaboration','Needs clarification']}},
  actors:{dataPath:[...recordsPath,'actors'],displayId:{prefix:'SRS-ACT-',padding:3},labelField:'name',
    recordFilter:{key:'status',notIn:['Not an actor']}},
  concepts:{dataPath:[...recordsPath,'domainConcepts'],displayId:{prefix:'SRS-DOM-',padding:3},labelField:'name'},
  perspectives:{dataPath:[...recordsPath,'perspectives'],displayId:{prefix:'SRS-VPT-',padding:3},labelField:'viewpoint'}
};

export function links(key:string,label:string,reference:Reference):Field {
  return {key,label,type:'record-links',default:'',reference,referenceFormat:'ids',completion:false,
    aiHint:'Reference existing named records by their saved IDs. Do not create new canonical identities within a model.'};
}

export function modelFigureConfig(type:string,sources:DiagramEvidenceSource[],
  metadata:NonNullable<DiagramConfig['batch']>['metadata'],recordFields:string[]=[]):DiagramConfig {
  return {type,sources,recordFields,batch:{metadata}};
}
export const source=(key:string,reference:Reference,fields:string[]):DiagramEvidenceSource=>({key,reference,fields});

const outcome=choice('modelOutcome','Model review outcome',
  ['Model reviewed','Not applicable','Needs clarification'],{completion:true,helpText:'Selecting a result records the analyst decision; the checks below still flag unsupported or missing evidence.'});

export function modelReviewSection(id:string,target:string,question:string):Section {
  return {
    id,key:id,title:'Model Review',documentTarget:target,
    description:question,
    help:'Reconcile every material finding in the original use case, vocabulary, requirement, or SRS-ISS issue. This page is not a new register of requirements or approvals.',
    fields:[
      outcome,
      text('modelScope','Modeled scenario / boundary, or reason no model is needed',
        {completion:true,rows:2,placeholder:'Name the actual source case/object or explain why this model adds no useful independent view.'}),
      text('reviewFindings','Specific discrepancies and source corrections (optional)',
        {completion:false,optional:true,placeholder:'Cite saved IDs and correct the original records. Create/link an SRS-ISS issue for an unresolved discrepancy.'})
    ]
  };
}

export function figureSection(id:string,title:string,target:string,group:string,
  config:DiagramConfig,extra:Field[]=[]):Section {
  const base=recordSection(id,title,target,1,'artifacts','FIG-','title',[
    {key:'artifactGroup',label:'Figure group',type:'text',default:group,hidden:true,editable:false,includeInPreview:false,includeInPrompt:false,completion:false},
    text('title','Figure title',{type:'text',completion:true}),
    {key:'file',label:'Model diagram',type:'diagram-file',default:null,collectionPath:[...recordsPath,'artifacts'],artifactField:'file',diagram:config,completion:true,
      aiHint:'Upload an editable DrawIO/XML diagram or PNG/JPEG. Section AI prompt produces an ordered dsrs-diagrams batch; figure AI prompt produces one dsrs-diagram. The application generates editable DrawIO from validated semantic JSON; no file bytes enter the prompt.'},
    text('caption','Figure caption / supported conclusion',{optional:true,completion:false}),
    links('useCaseReferences','Use cases illustrated',modelReferences.cases),
    ...extra,
    choice('figureStatus','Model status',['Draft','Reviewed with questions','Reconciled'],{completion:false,optional:true}),
    text('figureFindings','Missing responsibilities, transitions or interface behavior (optional)',
      {completion:false,optional:true,placeholder:'Cite affected canonical record IDs or an open SRS-ISS issue. Do not treat file metadata alone as proof of a reviewed diagram.'})
  ],{
    displayId:{prefix:'FIG-',padding:4},
    itemLabel:'Model figure',addLabel:'Add model figure',
    artifactField:'file',minimum:0,completionMinimum:0,completionMode:'all-required',
    completionFields:['title','file'],recordFilter:{key:'artifactGroup',equals:group}
  });
  return {...base,description:'Use the shared FIG register. Add only figures useful for revealing or explaining behavior; keep their saved IDs and source links. Upload or generate a diagram, then review its actual content.'};
}

export function modelStage(args:{
  id:string;stateKey:string;label:string;description:string;target:string;
  evidence:EvidenceSource[];sections:Section[];task:string;
  steps:GuideStep[];definitions?:{term:string;definition:string}[];
}):SchemaNode {
  return {
    id:args.id,stateKey:args.stateKey,label:args.label,description:args.description,
    documentTargets:[args.target],
    formComponent:'model-stage-form',previewComponent:'placed-stage-preview',
    form:{kicker:'Phase 5 · Cross-check with models',intro:args.description,showCompletion:true},
    evidence:{title:'Sources to challenge with this model',summary:'Read the earlier records and correct their source if the model exposes an omission. Uploaded diagram bytes are never pasted into AI prompts.',sources:args.evidence},
    guide:{title:'Review '+args.label.toLowerCase(),summary:args.description,steps:[...args.steps,{title:'Carry findings back to their source',text:followUpGuidance}]},
    ai:{showInterview:true,task:args.task,definitions:args.definitions||[],
      interviewGuidance:'Review the selected existing scenarios, questions and source IDs before proposing a model. Clarify only consequential gaps; do not invent actors, domain concepts, lifecycle states, screens, policies or technologies. Check the model against earlier work.',
      draftingGuidance:'Preserve the canonical IDs and correct existing records at their source. Use the model as independent evidence, not a replacement catalog. Unverified claims are open questions, not facts. Stored diagram contents are not available in the text prompt.'},
    sections:args.sections
  };
}
