import type { DataModel, DocumentModel } from '../../core/schema/schema-types.ts';
import { asDataModel } from '../../core/schema/data-models.ts';

/** The canonical register remains shared by all phases; these are views, not copies. */
export interface SrsRecords extends DataModel {
  perspectives?: DataModel[]; actors?: DataModel[]; goals?: DataModel[];
  useCases?: DataModel[]; useCaseRelationships?: DataModel[];
  requirements?: DataModel[]; artifacts?: DataModel[]; evidenceIssues?: DataModel[];
  scopeDecisions?: DataModel[]; terms?: DataModel[]; audiences?: DataModel[];
  sources?: DataModel[];
}
export function srsRecords(documentModel: DocumentModel): SrsRecords {
  return asDataModel(documentModel.softwareRequirementsSpecification?.records) as SrsRecords;
}
