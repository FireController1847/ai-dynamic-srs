import type { DocumentModel, RecordReview, ReviewRecord, ReviewCatalog, SchemaNode, DataModel } from '../../../core/schema/schema-types.ts';
import { asDataModel, recordItems } from '../../../core/schema/data-models.ts';
import { srsRecords } from '../record-types.ts';
import { idFor, live, present, availableSrsIds, missingReferenceMessages } from '../record-review.ts';
import { followThroughReview } from '../follow-through-review.ts';
import { phaseFiveStages } from './stages.ts';

const groupFor:Record<string,string>={
  'srs-models-domain':'domain-class-model',
  'srs-models-interactions':'interaction-model',
  'srs-models-state':'state-model',
  'srs-models-interface-design':'ui-scenario'
};
const stageSection:Record<string,string>={
  'srs-models-domain':'domain-figures',
  'srs-models-interactions':'interaction-figures',
  'srs-models-state':'state-figures',
  'srs-models-interface-design':'ui-figures'
};

function nav(stage:SchemaNode,sectionId:string) {
  return {
    pageId:'software-requirements-specification',
    subpageSelections:{
      'software-requirements-specification':'srs-cross-check-models',
      'srs-cross-check-models':stage.id
    },
    anchorId:stage.id+'-'+sectionId
  };
}

export function modelReview(stageId:string,documentModel:DocumentModel):RecordReview {
  const stage=phaseFiveStages.find(candidate=>candidate.id===stageId);
  if (!stage) return {messages:[],catalogs:[]};
  const records=srsRecords(documentModel);
  const available=availableSrsIds(records);
  const domain=recordItems(records.domainConcepts).filter(live);
  const artifacts=recordItems(records.artifacts).filter(live)
    .filter(figure=>figure.artifactGroup===groupFor[stageId]);
  const local=asDataModel(asDataModel(documentModel.softwareRequirementsSpecification?.modelCrossChecks)[stage.stateKey]);
  const messages:string[]=[];
  const sourceReview=followThroughReview(documentModel,5);
  messages.push(...sourceReview.messages);
  const outcome=String(local.modelOutcome||'');
  if (!outcome) messages.push('Choose a model review outcome when the relevant evidence has been inspected.');
  if (outcome==='Not applicable' && !present(local.modelScope)) {
    messages.push('Explain why this type of model would add no useful independent view.');
  }
  if (outcome==='Model reviewed' && !artifacts.length) {
    messages.push('The review is marked modeled, but no diagram has been added to the shared FIG register for this stage.');
  }
  if (outcome==='Needs clarification' && !present(local.reviewFindings)) {
    messages.push('Identify the unresolved question and link it to the shared SRS-ISS issue register.');
  }
  if (stageId==='srs-models-domain' && outcome==='Model reviewed' && !domain.length) {
    messages.push('No domain concepts are recorded. Confirm the model references existing controlled terms or add only genuinely new concepts.');
  }
  const fields=['useCaseReferences','domainConceptReferences','actorReferences','userClassReferences',
    'statefulConceptId','relatedConceptReferences','requirementReferences','interfaceRequirementReferences'];
  const enriched=artifacts.map((figure):ReviewRecord=>({...figure,referenceId:idFor('FIG-',figure),label:figure.title||'Untitled figure'}));
  for (const figure of enriched) {
    messages.push(...missingReferenceMessages(figure,fields,available));
    if (!present(figure.title)) messages.push(`${figure.referenceId}: give the figure a meaningful title.`);
    if (!asDataModel(figure.file).content) messages.push(`${figure.referenceId}: upload or import an actual diagram; descriptive metadata alone is not a model.`);
    if (!present(figure.useCaseReferences) && stageId!=='srs-models-domain') {
      messages.push(`${figure.referenceId}: identify the source use-case path or explain the system-wide model scope.`);
    }
    if (['Reviewed with questions'].includes(String(figure.figureStatus))
      && !present(figure.figureFindings)) {
      messages.push(`${figure.referenceId}: name the differences and carry unresolved items into SRS-ISS.`);
    }
    if (stageId==='srs-models-interactions' && !present(figure.scenarioPath))
      messages.push(`${figure.referenceId}: identify the exact normal, alternative or exception scenario.`);
    if (stageId==='srs-models-state' && !present(figure.statefulConceptId))
      messages.push(`${figure.referenceId}: associate the state model with a known stateful concept, or reconcile the missing concept first.`);
    if (stageId==='srs-models-interface-design' && !present(figure.scenarioPath))
      messages.push(`${figure.referenceId}: identify the user task and named path being modeled.`);
  }
  const concepts=domain.map((item):ReviewRecord=>({...item,referenceId:idFor('SRS-DOM-',item),
    label:item.name||'Unnamed domain concept'}));
  for(const concept of concepts) {
    messages.push(...missingReferenceMessages(concept,fields,available));
    if (!present(concept.name)||!present(concept.meaning))
      messages.push(`${concept.referenceId}: name and define the conceptual responsibility.`);
  }
  const domainStage=phaseFiveStages[0];
  const catalogs:ReviewCatalog[]=[
    {title:'Domain concepts',items:concepts,target:nav(domainStage,'domain-concepts')},
    {title:stage.label+' figures',items:enriched,target:nav(stage,stageSection[stageId])},
    sourceReview.catalog
  ];
  return {messages:[...new Set(messages)],catalogs};
}
