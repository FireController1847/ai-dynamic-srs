import { FORMAT_NAME, FORMAT_VERSION } from "./workspace-format.js";

export function validateWorkspace(workspace) {
  if (!workspace || typeof workspace !== "object") {
    throw new Error("The selected file does not contain a workspace.");
  }

  if (workspace.format !== FORMAT_NAME) {
    throw new Error("This is not a Dynamic SRS workspace file.");
  }

  if (!Number.isInteger(workspace.formatVersion) || workspace.formatVersion < 1) {
    throw new Error("The workspace has an invalid format version.");
  }

  if (workspace.formatVersion > FORMAT_VERSION) {
    throw new Error(`Unsupported workspace version: ${workspace.formatVersion}.`);
  }

  if (!workspace.document || typeof workspace.document !== "object") {
    throw new Error("The workspace is missing its document data.");
  }

  if (!workspace.document.sections || typeof workspace.document.sections !== "object" || Array.isArray(workspace.document.sections)) {
    throw new Error("The workspace is missing its section data.");
  }

  return workspace;
}

export function parseWorkspace(serialized) {
  try {
    return validateWorkspace(JSON.parse(serialized));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("The selected file is not valid JSON.");
    }

    throw error;
  }
}
