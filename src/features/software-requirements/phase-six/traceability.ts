import type { DataModel, DocumentModel } from '../../../core/schema/schema-types.ts';
import { recordItems } from '../../../core/schema/data-models.ts';
import { srsRecords } from '../record-types.ts';
import { live, idFor, referenceIds, present } from '../record-review.ts';
import { requirementReferenceId } from '../requirement-records.ts';

export interface TraceRow {
  id: string;
  statement: string;
  status: string;
  sources: string[];
  sourceEvidence: string;
  useCases: string[];
  paths: string;
  goals: string[];
  actors: string[];
  figures: string[];
  criterion: string;
  method: string;
  findings: string[];
}
export interface CoverageFinding {
  category: 'coverage' | 'consistency' | 'gaps' | 'verification';
  message: string;
}
export interface ReconciliationModel {
  requirements: TraceRow[];
  findings: CoverageFinding[];
  counts: { goals: number; cases: number; requirements: number; figures: number; withCriteria: number; withMethods: number };
}

function ids(value: unknown): string[] {
  return referenceIds(value);
}
function active(value: unknown): DataModel[] {
  return recordItems(value).filter(live);
}
function distinct(values: string[]): string[] {
  return [...new Set(values)];
}
const eligibleCase = (caseRecord: DataModel) => !['Excluded', 'Deferred'].includes(String(caseRecord.disposition || ''));
const eligibleGoal = (goal: DataModel) => !['Excluded', 'Deferred'].includes(String(goal.scopeStatus || ''));
const eligibleRequirement = (requirement: DataModel) => !['Deferred', 'Rejected'].includes(String(requirement.status || ''));

export function reconciliationModel(document: DocumentModel): ReconciliationModel {
  const records = srsRecords(document);
  const actors = active(records.actors).filter(item => item.status !== 'Not an actor');
  const goals = active(records.goals).filter(eligibleGoal);
  const cases = active(records.useCases).filter(eligibleCase);
  const requirements = active(records.requirements).filter(eligibleRequirement);
  const figures = active(records.artifacts);
  const activeCases = new Map(cases.map(item => [idFor('SRS-UC-', item), item]));
  const activeGoals = new Map(goals.map(item => [idFor('SRS-GOL-', item), item]));
  const activeActors = new Map(actors.map(item => [idFor('SRS-ACT-', item), item]));
  const findings: CoverageFinding[] = [];
  const push = (category: CoverageFinding['category'], message: string) => findings.push({ category, message });

  for (const [goalId, goal] of activeGoals) {
    const linked = cases.filter(item => ids(item.goalReferences).includes(goalId));
    if (!linked.length) push('coverage', `${goalId}: no active use case implements this goal. Correct 02.3 Use Cases or record a supported exclusion in the source.`);
    if (!activeActors.has(String(goal.actorId || '').toUpperCase()))
      push('consistency', `${goalId}: its actor ID is absent, inactive or unconfirmed. Reconcile Actors & Goals.`);
  }

  for (const [caseId, useCase] of activeCases) {
    const linkedReqs = requirements.filter(item => ids(item.useCaseReferences).includes(caseId));
    const functional = linkedReqs.filter(item => String(item.requirementKind || 'Functional') === 'Functional');
    if (!linkedReqs.length) push('coverage', `${caseId}: no active requirement references this use case; compare its normal and exception paths in 03.4/03.5.`);
    else if (!functional.length) push('coverage', `${caseId}: only nonfunctional/interface obligations are linked; check that observable behavior has functional requirements.`);
    if (!ids(useCase.goalReferences).some(id => activeGoals.has(id)))
      push('coverage', `${caseId}: no current in-scope goal supports the use case. Confirm scope and goal relationships in 02.3.`);
    const actor = String(useCase.primaryActorId || '').toUpperCase();
    if (!actor || !activeActors.has(actor))
      push('consistency', `${caseId}: primary actor is missing or inactive.`);
    for (const goalId of ids(useCase.goalReferences)) if (!activeGoals.has(goalId))
      push('consistency', `${caseId}: linked goal ${goalId} is missing, inactive or out of scope.`);
  }

  const rows: TraceRow[] = requirements.map(requirement => {
    const id = requirementReferenceId(requirement);
    const useCases = ids(requirement.useCaseReferences);
    const sourceEvidence = String(requirement.sourceReferences || '').trim();
    const sources = distinct([...ids(requirement.sourceReferences), ...useCases]);
    const relatedCases = useCases.flatMap(caseId => {
      const linked = activeCases.get(caseId);
      return linked ? [linked] : [];
    });
    const goalsForRow = distinct(relatedCases.flatMap(item => ids(item.goalReferences)));
    const actorsForRow = distinct(relatedCases.flatMap(item => [
      ...ids(item.primaryActorId), ...ids(item.supportingActorReferences)
    ]));
    const relatedFigures = figures.filter(item =>
      useCases.some(caseId => ids(item.useCaseReferences).includes(caseId))
      || ids(requirement.figureReferences).includes(idFor('FIG-', item)));
    const figureIds = distinct(relatedFigures.map(item => idFor('FIG-', item)));
    const criterion = String(requirement.acceptanceCriterion || '').trim();
    const method = String(requirement.verificationMethod || '').trim();
    const paths = String(requirement.flowReferences || '').trim();
    const status = String(requirement.status || 'Draft');
    const issues: string[] = [];
    if (!present(requirement.statement)) issues.push('Requirement statement is missing.');
    if (!sources.length && !sourceEvidence && !present(requirement.rationale))
      issues.push('No supporting source/use case or reason for system-wide applicability.');
    for (const useCaseId of useCases) if (!activeCases.has(useCaseId))
      issues.push(`Use case ${useCaseId} is missing or inactive.`);
    if (String(requirement.requirementKind || 'Functional') === 'Functional'
      && relatedCases.some(item => present(item.normalFlow) || present(item.alternativeFlows))
      && !paths) issues.push('Named behavior paths exist, but source step/path references are absent.');
    if (!criterion) issues.push('Define an observable acceptance criterion.');
    if (!method) issues.push('Choose a planned verification method.');
    if (String(requirement.requirementKind) === 'Quality' && requirement.targetAgreement !== 'Agreed')
      issues.push('Quality target is proposed, unconfirmed or missing agreement.');
    if (status !== 'Reviewed') issues.push(`Status is ${status}; it is not an approved requirement.`);
    for (const issue of issues) push(issue.includes('criterion') || issue.includes('verification method')
      ? 'verification' : issue.includes('Status') || issue.includes('target')
        ? 'consistency' : 'coverage', `${id}: ${issue}`);
    return {
      id,statement:String(requirement.statement || ''),status,sources,sourceEvidence,useCases,paths,
      goals:goalsForRow,actors:actorsForRow,figures:figureIds,
      criterion,method,findings:issues
    };
  });

  for (const figure of figures) {
    const figureId = idFor('FIG-', figure);
    for (const caseId of ids(figure.useCaseReferences)) if (!activeCases.has(caseId))
      push('consistency', `${figureId}: figure cites missing or inactive ${caseId}; correct the saved FIG metadata or source case.`);
    if (['Reviewed with questions', 'Reviewed with differences'].includes(String(figure.figureStatus)))
      push('gaps', `${figureId}: model still has review differences; resolve the linked issues and source descriptions.`);
    if (!figure.file || typeof figure.file !== 'object' || !present((figure.file as DataModel).content))
      push('consistency', `${figureId}: saved figure metadata has no readable diagram payload; it cannot prove model coverage.`);
  }

  const knownSourceIds = new Set([...activeCases.keys(),...activeGoals.keys(),...activeActors.keys(),
    ...figures.map(item=>idFor('FIG-',item)),
    ...requirements.map(requirementReferenceId)]);
  for (const row of rows) {
    for (const sourceId of row.sources.filter(id => /^SRS-|^FIG-/.test(id)))
      if (!knownSourceIds.has(sourceId) && !sourceId.startsWith('SRS-SCP-') && !sourceId.startsWith('SRS-VPT-')
        && !sourceId.startsWith('SRS-TERM-') && !sourceId.startsWith('SRS-ISS-') && !sourceId.startsWith('SRS-DOM-'))
        push('consistency', `${row.id}: linked evidence ${sourceId} is missing or inactive.`);
  }
  return {
    requirements: rows,
    findings: distinct(findings.map(item => item.category+'|'+item.message)).map(value => {
      const separator=value.indexOf('|');
      return {category:value.slice(0,separator) as CoverageFinding['category'],message:value.slice(separator+1)};
    }),
    counts: {
      goals:goals.length,cases:cases.length,requirements:requirements.length,figures:figures.length,
      withCriteria:rows.filter(item => !!item.criterion).length,
      withMethods:rows.filter(item => !!item.method).length
    }
  };
}
