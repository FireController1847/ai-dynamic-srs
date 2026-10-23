import type { DataModel, DocumentModel, RecordReview, ReviewRecord } from '../../../core/schema/schema-types.ts';
import { asDataModel, recordItems } from '../../../core/schema/data-models.ts';
import { srsRecords } from '../record-types.ts';
import { live, idFor, present, availableSrsIds, missingReferenceMessages } from '../record-review.ts';
import { requirementReferenceId } from '../requirement-records.ts';
import { followThroughReview } from '../follow-through-review.ts';
import { reconciliationModel } from './traceability.ts';

const stageKey:Record<string,string>={
  'srs-reconciliation-coverage':'coverageReview',
  'srs-reconciliation-consistency':'consistencyReview',
  'srs-reconciliation-gaps':'gapResolution',
  'srs-reconciliation-verification':'verificationTraceability'
};
const stageType:Record<string,string>={
  'srs-reconciliation-coverage':'coverage',
  'srs-reconciliation-consistency':'consistency',
  'srs-reconciliation-gaps':'gaps',
  'srs-reconciliation-verification':'verification'
};
const route=(phase:string,stage:string,anchor:string)=>({
  pageId:'software-requirements-specification',
  subpageSelections:{
    'software-requirements-specification':phase,
    [phase]:stage
  },anchorId:stage+'-'+anchor
});

export function reconciliationReview(stageId:string,document:DocumentModel):RecordReview {
  const records=srsRecords(document);
  const model=reconciliationModel(document);
  const activeReqs=recordItems(records.requirements).filter(live)
    .filter(item=>!['Deferred','Rejected'].includes(String(item.status)));
  const phaseFollow=followThroughReview(document,6);
  const messages:string[]=[
    ...model.findings.filter(item=>stageType[stageId]===item.category
      || stageId==='srs-reconciliation-coverage' && item.category==='verification'
      || stageId==='srs-reconciliation-verification' && item.category==='coverage').map(item=>item.message)
  ];
  if(stageId==='srs-reconciliation-gaps'||stageId==='srs-reconciliation-consistency') {
    messages.push(...phaseFollow.messages);
    for (const issue of recordItems(records.evidenceIssues).filter(live)) {
      if (issue.status==='Accepted exception')
        messages.push(`${idFor('SRS-ISS-',issue)}: accepted exception remains visible for final document assembly; preserve its scope and authority.`);
    }
  }
  if(stageId==='srs-reconciliation-consistency'||stageId==='srs-reconciliation-gaps') {
    const conditions=recordItems(records.scopeDecisions).filter(live);
    for(const condition of conditions) {
      const id=idFor('SRS-SCP-',condition);
      if(condition.decisionType==='Assumption' && condition.validationStatus!=='Validated')
        messages.push(`${id}: assumption/dependency remains unvalidated; check affected records, validation plan and failure impact.`);
      if(condition.decisionType==='Constraint' && condition.status!=='Confirmed' && condition.status!=='Rejected')
        messages.push(`${id}: constraint authority or status remains unsettled; do not treat it as imposed.`);
    }
    for(const req of activeReqs) {
      const id=requirementReferenceId(req);
      if(req.requirementKind==='Quality' && req.targetAgreement!=='Agreed')
        messages.push(`${id}: target is not established as agreed. Keep proposed thresholds provisional.`);
    }
    for(const item of recordItems(records.artifacts).filter(live)) {
      if(['Reviewed with differences','Reviewed with questions'].includes(String(item.figureStatus)))
        messages.push(`${idFor('FIG-',item)}: previous model review still has differences or unanswered questions.`);
    }
    const stageModels=asDataModel(document.softwareRequirementsSpecification?.modelCrossChecks);
    for(const [key,label] of [
      ['domainModel','Domain & Class Model'],['interactionModels','Interaction Models'],
      ['stateModels','State Models'],['interfaceDesignEvidence','UI Scenarios']
    ]) {
      const local=asDataModel(stageModels[key]);
      if(local.modelOutcome==='Needs clarification')
        messages.push(`${label}: the Phase 5 review is still marked Needs clarification; revisit its source discrepancies.`);
    }
  }
  const local=asDataModel(asDataModel(document.softwareRequirementsSpecification?.specificationReconciliation)[stageKey[stageId]]);
  const status=String(local.reviewOutcome||'');
  if(status==='Reviewed; no known structural gaps' && messages.length)
    messages.unshift('Review disposition contradicts the live findings. Resolve or explicitly acknowledge these issues before claiming no known structural gaps.');
  if(status==='Reviewed with open findings' && !present(local.reviewEvidence) && !present(local.issueReferences))
    messages.push('Name the material open findings or link the SRS-ISS records; the status alone does not explain the exception.');
  const available=availableSrsIds(records);
  if(stageId==='srs-reconciliation-gaps'||stageId==='srs-reconciliation-verification')
    for(const issue of recordItems(records.evidenceIssues).filter(live)) {
      messages.push(...missingReferenceMessages({...issue,referenceId:idFor('SRS-ISS-',issue)},['affectedReferences'],available));
    }
  const requirements:ReviewRecord[]=activeReqs.map(item=>({
    ...item,referenceId:requirementReferenceId(item),label:item.statement||'Missing requirement statement'
  }));
  const issues:ReviewRecord[]=recordItems(records.evidenceIssues).filter(live).map(item=>({
    ...item,referenceId:idFor('SRS-ISS-',item),label:item.description||'Missing issue description'
  }));
  return {
    messages:[...new Set(messages)],
    catalogs:[
      {title:'Canonical requirements',items:requirements,
        target:route('srs-describe-functional-behavior','srs-behavior-functional-requirements','functional-requirements')},
      {title:'Shared SRS issues',items:issues,
        target:route('srs-reconcile-verify','srs-reconciliation-gaps','reconciliation-issues')}
    ]
  };
}
