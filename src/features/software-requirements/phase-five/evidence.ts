import type { EvidenceSource } from '../../../core/schema/schema-types.ts';
import { catalogSource, detailSource, activitySource } from '../phase-three/evidence.ts';
import { functionalSource, attributesSource, interfacesSource, operatingSource } from '../phase-four/evidence.ts';

const srs = 'software-requirements-specification';
export const vocabularySource: EvidenceSource = {
  pageId:srs,nodeId:'srs-baseline-vocabulary',
  dataPath:['softwareRequirementsSpecification','baselineConstruction','vocabularyBaseline'],
  subpageSelections:{
    [srs]:'srs-establish-baseline','srs-establish-baseline':'srs-baseline-vocabulary'
  },
  reason:'Use established meanings; revise the same vocabulary records when model concepts expose a conflict.',
  groups:[{sectionId:'controlled-terms'}]
};

export function modelSource(nodeId:string,stateKey:string,sectionIds:string[],reason:string):EvidenceSource {
  return {
    pageId:srs,nodeId,
    dataPath:['softwareRequirementsSpecification','modelCrossChecks',stateKey],
    subpageSelections:{[srs]:'srs-cross-check-models','srs-cross-check-models':nodeId},
    reason,groups:sectionIds.map(sectionId=>({sectionId}))
  };
}

export const domainSource=modelSource(
  'srs-models-domain','domainModel',['domain-concepts','domain-figures'],
  'Established domain entities and model figure metadata; return semantic discoveries to canonical terms and use cases.'
);
export const interactionSource=modelSource(
  'srs-models-interactions','interactionModels',['interaction-figures'],
  'Scenario interactions and message ordering; challenge the existing detailed path records.'
);
export const stateSource=modelSource(
  'srs-models-state','stateModels',['state-figures'],
  'State/transition evidence and the gaps found in existing requirements.'
);

export const domainEvidence=[vocabularySource,catalogSource,detailSource,functionalSource,operatingSource];
export const interactionEvidence=[catalogSource,detailSource,activitySource,domainSource,functionalSource];
export const stateEvidence=[domainSource,detailSource,interactionSource,functionalSource,attributesSource];
export const uiEvidence=[catalogSource,detailSource,interfacesSource,attributesSource,interactionSource,stateSource];
