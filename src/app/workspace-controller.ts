import type { DataModel, DocumentModel, SchemaNode, CopyRequest, NavigationRequest, PrintRequest } from '../core/schema/schema-types.ts';
import { asDataModel } from "../core/schema/data-models.ts";
import { createDocumentState } from "../core/schema/state-factory.ts";
import { validateWorkspace } from "../core/workspace/workspace-validation.ts";
import { createWorkspaceId } from "../core/workspace/workspace-storage.ts";

function validSubpageSelections(pages: readonly SchemaNode[], savedSelections: unknown) {
  const selections = asDataModel(savedSelections);
  const validSelections: Record<string, string> = {};

  function visit(node: SchemaNode) {
    if (!node.subpages?.length) return;

    const selectedId = selections[node.id];
    if (typeof selectedId === "string" && node.subpages.some(({ id }) => id === selectedId)) {
      validSelections[node.id] = selectedId;
    }

    node.subpages.forEach(visit);
  }

  pages.forEach(visit);
  return validSelections;
}

export function workspaceStateFrom(workspace: unknown, pages: readonly SchemaNode[], defaultPageId: string) {
  const { document } = validateWorkspace(workspace);

  return {
    activePage: pages.some((page) => page.id === document.activePage)
      ? document.activePage!
      : defaultPageId,
    activeSubpages: validSubpageSelections(pages, document.activeSubpages),
    documentSections: createDocumentState(pages, document.sections),
    workspaceCreatedAt: document.createdAt || new Date().toISOString(),
    workspaceId: document.id || createWorkspaceId(),
    workspaceUpdatedAt: document.updatedAt || ""
  };
}
