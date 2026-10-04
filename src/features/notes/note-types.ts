import type { DataModel } from '../../core/schema/schema-types.ts';
export interface Note extends DataModel {
  id: number; title: string; category: string; status: string;
  createdDate: string; createdAt: string; updatedDate: string; updatedAt: string;
  author: string; body: string; tags: string; relatedIds: string;
  references: DataModel[]; editHistory: DataModel[];
}
export interface NotesModel extends DataModel { notes: Note[]; }
