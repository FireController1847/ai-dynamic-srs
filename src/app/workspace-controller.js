import { createDocumentState } from "../core/schema/state-factory.js";
import { validateWorkspace } from "../core/workspace/workspace-validation.js";
import { createWorkspaceId } from "../core/workspace/workspace-storage.js";

function validSubpageSelections(pages, savedSelections) {
  const selections = savedSelections && typeof savedSelections === "object" && !Array.isArray(savedSelections)
    ? savedSelections
    : {};
  const validSelections = {};

  function visit(node) {
    if (!node.subpages?.length) return;

    const selectedId = selections[node.id];
    if (node.subpages.some(({ id }) => id === selectedId)) {
      validSelections[node.id] = selectedId;
    }

    node.subpages.forEach(visit);
  }

  pages.forEach(visit);
  return validSelections;
}

export function workspaceStateFrom(workspace, pages, defaultPageId) {
  const { document } = validateWorkspace(workspace);

  return {
    activePage: pages.some((page) => page.id === document.activePage)
      ? document.activePage
      : defaultPageId,
    activeSubpages: validSubpageSelections(pages, document.activeSubpages),
    documentSections: createDocumentState(pages, document.sections),
    workspaceCreatedAt: document.createdAt || new Date().toISOString(),
    workspaceId: document.id || createWorkspaceId(),
    workspaceUpdatedAt: document.updatedAt || ""
  };
}
