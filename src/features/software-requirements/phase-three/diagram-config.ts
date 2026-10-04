import type { DiagramConfig, DiagramEvidenceSource } from '../../../core/artifacts/diagram-graph.ts';
import { recordsPath } from './shared.ts';

const cases = (fields: string[]): DiagramEvidenceSource => ({
  key: 'cases', reference: { dataPath: [...recordsPath, 'useCases'], displayId: { prefix: 'SRS-UC-', padding: 3 }, labelField: 'name',
    recordFilter: { key: 'disposition', in: ['Candidate', 'Ready for elaboration', 'Needs clarification'] } }, fields
});
const actors: DiagramEvidenceSource = {
  key: 'actors', reference: { dataPath: [...recordsPath, 'actors'], displayId: { prefix: 'SRS-ACT-', padding: 3 }, labelField: 'name',
    recordFilter: { key: 'status', notIn: ['Not an actor'] } }, fields: ['name'],
  linkedFrom: { source: 'cases', fields: ['primaryActorId', 'supportingActorReferences'] }
};
const labels: NonNullable<DiagramConfig['labels']> = [{ id: '@system', paths: [
  ['softwareRequirementsSpecification', 'projectName'], ['clientRequirements', 'projectName'], ['systemRequest', 'projectName']
], fallback: 'System' }];

export const useCaseDiagramConfig: DiagramConfig = {
  type: 'use-case', scope: { source: 'cases', field: 'useCaseReferences' }, labels,
  batch: { metadata: [
    { field: 'title', required: true },
    { field: 'caption' },
    { field: 'useCaseReferences', required: true, source: 'cases', nodeKind: 'use-case' },
    { field: 'actorReferences', required: true, source: 'actors', nodeKind: 'actor' },
    { field: 'relationshipReferences', source: 'relationships' }
  ] },
  sources: [cases(['name', 'primaryActorId', 'supportingActorReferences']), actors, {
    key: 'relationships', reference: { dataPath: [...recordsPath, 'useCaseRelationships'], displayId: { prefix: 'SRS-REL-', padding: 3 }, labelField: 'relationship' },
    fields: ['fromUseCaseId', 'relationship', 'toUseCaseId', 'condition'],
    linkedFrom: { source: 'cases', fields: ['fromUseCaseId', 'toUseCaseId'], requireAll: true }
  }]
};

export const activityDiagramConfig: DiagramConfig = {
  type: 'activity', scope: { source: 'cases', field: 'useCaseReferences' }, recordFields: ['scenario'], labels,
  batch: { metadata: [
    { field: 'title', required: true },
    { field: 'caption' },
    { field: 'useCaseReferences', required: true, source: 'cases' },
    { field: 'actorReferences', source: 'actors' },
    { field: 'scenario', required: true }
  ] },
  sources: [cases(['name', 'primaryActorId', 'supportingActorReferences', 'briefDescription', 'trigger', 'preconditions', 'successGuarantee', 'failureGuarantee', 'normalFlow', 'subflows', 'alternativeFlows', 'specialConditions']), actors]
};
