import type { DataModel, DocumentModel } from '../schema/schema-types.ts';

export interface WorkspaceSnapshot {
  format: string;
  formatVersion: number;
  application?: { name: string; version: string };
  document: {
    id?: string; title?: string; createdAt?: string; updatedAt?: string;
    activePage?: string; activeSubpages?: Record<string, string>;
    sections: DocumentModel;
  };
}
export interface SnapshotInput {
  activePage?: string; activeSubpages?: Record<string, string>;
  createdAt?: string; id?: string; projectContext: DataModel; sections: DocumentModel;
}
