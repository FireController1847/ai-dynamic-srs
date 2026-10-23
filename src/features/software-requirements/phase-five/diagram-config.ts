import type { DiagramConfig } from '../../../core/artifacts/diagram-graph.ts';
import { modelReferences, modelFigureConfig, source } from './shared.ts';

const cases=source('cases',modelReferences.cases,
  ['name','briefDescription','primaryActorId','trigger','normalFlow','subflows','alternativeFlows','preconditions','successGuarantee','failureGuarantee']);
const concepts=source('concepts',modelReferences.concepts,
  ['name','meaning','responsibilities','attributes','relatedConceptReferences','useCaseReferences']);
const actors=source('actors',modelReferences.actors,['name','interaction']);
const perspectives=source('perspectives',modelReferences.perspectives,['viewpoint','characteristics']);

const base=[
  {field:'title',required:true},
  {field:'caption'},
  {field:'useCaseReferences',source:'cases'}
];

export const domainDiagramConfig:DiagramConfig=modelFigureConfig('domain',[concepts,cases],[
  ...base,{field:'domainConceptReferences',source:'concepts'}
],['modelFocus','relationshipNotes']);

export const interactionDiagramConfig:DiagramConfig=modelFigureConfig('interaction',[cases,actors,concepts],[
  ...base,{field:'scenarioPath',required:true},
  {field:'actorReferences',source:'actors'},
  {field:'domainConceptReferences',source:'concepts'}
],['scenarioPath','messageSequence']);

export const stateDiagramConfig:DiagramConfig=modelFigureConfig('state',[concepts,cases],[
  ...base,{field:'statefulConceptId'},
  {field:'transitionNotes'}
],['statefulConceptId','eventsAndGuards','transitionNotes']);

export const uiDiagramConfig:DiagramConfig=modelFigureConfig('ui-flow',[cases,actors,perspectives],[
  ...base,{field:'scenarioPath',required:true},{field:'userClassReferences',source:'perspectives'}
],['scenarioPath','inputFeedback','failureRecovery']);
