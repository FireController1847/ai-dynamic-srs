import { parseWorkspace, validateWorkspace } from "./workspace-validation.ts";

const STORAGE_KEY = "dynamic-srs:last-workspace";

export function createWorkspaceId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `dsrs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function saveLastWorkspace(workspace: unknown) {
  const validated = validateWorkspace(workspace);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
}

export function loadLastWorkspace() {
  const serialized = window.localStorage.getItem(STORAGE_KEY);
  return serialized ? parseWorkspace(serialized) : null;
}

export function clearLastWorkspace() {
  window.localStorage.removeItem(STORAGE_KEY);
}
