import { isDataModel } from '../schema/data-models.ts';
import { FORMAT_NAME, FORMAT_VERSION } from './workspace-format.ts';
import type { WorkspaceSnapshot } from './workspace-types.ts';

export function validateWorkspace(workspace: unknown): WorkspaceSnapshot {
  if (!isDataModel(workspace)) throw new Error('The selected file does not contain a workspace.');
  if (workspace.format !== FORMAT_NAME) throw new Error('This is not a Dynamic SRS workspace file.');
  if (typeof workspace.formatVersion !== 'number' || !Number.isInteger(workspace.formatVersion) || workspace.formatVersion < 1) {
    throw new Error('The workspace has an invalid format version.');
  }
  if (workspace.formatVersion > FORMAT_VERSION) throw new Error(`Unsupported workspace version: ${workspace.formatVersion}.`);
  if (!isDataModel(workspace.document)) throw new Error('The workspace is missing its document data.');
  if (!isDataModel(workspace.document.sections)) throw new Error('The workspace is missing its section data.');
  // Versioned section values remain open and are normalized by the schema state factory.
  return workspace as unknown as WorkspaceSnapshot;
}

export function parseWorkspace(serialized: string): WorkspaceSnapshot {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return validateWorkspace(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('The selected file is not valid JSON.');
    throw error;
  }
}
